import { Router } from "express";
import type { Application, ApplicationStatus, Document } from "@prisma/client";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { canTransition, isApplicationStatus } from "../lib/state-machine";
import {
  maybeAdvanceUnderwriting,
  randomDelayMs,
} from "../lib/underwriting";
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  validateCreateApplication,
} from "../lib/validation";

export const applicationsRouter = Router();

applicationsRouter.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

function extOf(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
}

function serializeApplication(
  app: Application & { documents?: Document[] },
) {
  return {
    id: app.id,
    userId: app.userId,
    borrowerName: app.borrowerName,
    borrowerEmail: app.borrowerEmail,
    loanAmount: app.loanAmount,
    propertyType: app.propertyType,
    annualIncome: app.annualIncome,
    status: app.status,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    documents: app.documents?.map((doc) => ({
      id: doc.id,
      filename: doc.filename,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      uploadedAt: doc.uploadedAt.toISOString(),
    })),
  };
}

function routeId(id: string | string[] | undefined): string | undefined {
  return typeof id === "string" ? id : undefined;
}

async function loadApplication(id: string, userId: string) {
  const app = await prisma.application.findUnique({
    where: { id },
    include: { documents: true },
  });
  if (!app) return { status: 404 as const };
  if (app.userId !== userId) return { status: 403 as const };
  return { status: 200 as const, app };
}

applicationsRouter.post("/", async (req, res) => {
  const parsed = validateCreateApplication(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: "Validation failed", details: parsed.details });
    return;
  }

  const app = await prisma.application.create({
    data: {
      userId: req.userId,
      ...parsed.value,
    },
    include: { documents: true },
  });

  res.status(201).json(serializeApplication(app));
});

applicationsRouter.get("/", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10));
  const statusParam =
    typeof req.query.status === "string" ? req.query.status : undefined;

  if (statusParam && !isApplicationStatus(statusParam)) {
    res.status(400).json({
      error: "Validation failed",
      details: { status: "invalid status" },
    });
    return;
  }

  const where = {
    userId: req.userId,
    ...(statusParam && isApplicationStatus(statusParam)
      ? { status: statusParam }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  res.json({
    items: items.map((item) => serializeApplication(item)),
    page,
    pageSize,
    total,
  });
});

applicationsRouter.get("/:id", async (req, res) => {
  const id = routeId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Validation failed", details: { id: "required" } });
    return;
  }
  const result = await loadApplication(id, req.userId);
  if (result.status !== 200) {
    res.status(result.status).json({
      error: result.status === 404 ? "Not found" : "Forbidden",
    });
    return;
  }
  res.json(serializeApplication(result.app));
});

applicationsRouter.get("/:id/status", async (req, res) => {
  const id = routeId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Validation failed", details: { id: "required" } });
    return;
  }
  const result = await loadApplication(id, req.userId);
  if (result.status !== 200) {
    res.status(result.status).json({
      error: result.status === 404 ? "Not found" : "Forbidden",
    });
    return;
  }

  const advanced = await maybeAdvanceUnderwriting(result.app);
  res.json({
    id: advanced.id,
    status: advanced.status,
    updatedAt: advanced.updatedAt.toISOString(),
  });
});

applicationsRouter.put("/:id/status", async (req, res) => {
  const id = routeId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Validation failed", details: { id: "required" } });
    return;
  }
  const result = await loadApplication(id, req.userId);
  if (result.status !== 200) {
    res.status(result.status).json({
      error: result.status === 404 ? "Not found" : "Forbidden",
    });
    return;
  }

  const next =
    typeof req.body?.status === "string" ? req.body.status : "";
  if (!isApplicationStatus(next)) {
    res.status(400).json({
      error: "Validation failed",
      details: { status: "invalid status" },
    });
    return;
  }

  const current = result.app.status;
  if (!canTransition(current, next)) {
    res.status(409).json({
      error: "Illegal status transition",
      from: current,
      to: next,
    });
    return;
  }

  const data: {
    status: ApplicationStatus;
    underwritingStartedAt?: Date;
    underwritingDelayMs?: number;
  } = { status: next };

  if (next === "submitted") {
    data.underwritingStartedAt = new Date();
    data.underwritingDelayMs = randomDelayMs();
  }

  const updated = await prisma.application.update({
    where: { id: result.app.id },
    data,
    include: { documents: true },
  });

  res.json(serializeApplication(updated));
});

applicationsRouter.post("/:id/documents", (req, res, next) => {
  upload.single("file")(req, res, (err: unknown) => {
    if (err && err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        error: "Validation failed",
        details: { file: "file must be 5MB or smaller" },
      });
      return;
    }
    if (err) {
      next(err);
      return;
    }
    next();
  });
}, async (req, res) => {
  const id = routeId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Validation failed", details: { id: "required" } });
    return;
  }
  const result = await loadApplication(id, req.userId);
  if (result.status !== 200) {
    res.status(result.status).json({
      error: result.status === 404 ? "Not found" : "Forbidden",
    });
    return;
  }

  if (result.app.status !== "draft") {
    res.status(400).json({
      error: "Validation failed",
      details: { file: "documents can only be uploaded while draft" },
    });
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({
      error: "Validation failed",
      details: { file: "multipart field 'file' is required" },
    });
    return;
  }

  const ext = extOf(file.originalname);
  if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
    res.status(400).json({
      error: "Validation failed",
      details: { file: "only PDF and JPG files are allowed" },
    });
    return;
  }

  const doc = await prisma.document.create({
    data: {
      applicationId: result.app.id,
      filename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    },
  });

  res.status(201).json({
    id: doc.id,
    filename: doc.filename,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    uploadedAt: doc.uploadedAt.toISOString(),
  });
});
