import type { PropertyType } from "@prisma/client";

const PROPERTY_TYPES: PropertyType[] = [
  "single_family",
  "condo",
  "townhouse",
  "multi_family",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CreateApplicationBody = {
  borrowerName: string;
  borrowerEmail: string;
  loanAmount: number;
  propertyType: PropertyType;
  annualIncome: number;
};

export function validateCreateApplication(
  body: unknown,
):
  | { ok: true; value: CreateApplicationBody }
  | { ok: false; details: Record<string, string> } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, details: { body: "must be an object" } };
  }

  const record = body as Record<string, unknown>;
  const details: Record<string, string> = {};

  const borrowerName =
    typeof record.borrowerName === "string" ? record.borrowerName.trim() : "";
  if (!borrowerName) details.borrowerName = "required";

  const borrowerEmail =
    typeof record.borrowerEmail === "string" ? record.borrowerEmail.trim() : "";
  if (!borrowerEmail) details.borrowerEmail = "required";
  else if (!EMAIL_RE.test(borrowerEmail)) details.borrowerEmail = "invalid email";

  const loanAmount = Number(record.loanAmount);
  if (!Number.isFinite(loanAmount) || loanAmount <= 0) {
    details.loanAmount = "must be greater than 0";
  }

  const annualIncome = Number(record.annualIncome);
  if (!Number.isFinite(annualIncome) || annualIncome <= 0) {
    details.annualIncome = "must be greater than 0";
  }

  const propertyType = record.propertyType;
  if (
    typeof propertyType !== "string" ||
    !PROPERTY_TYPES.includes(propertyType as PropertyType)
  ) {
    details.propertyType = "must be single_family, condo, townhouse, or multi_family";
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  return {
    ok: true,
    value: {
      borrowerName,
      borrowerEmail,
      loanAmount,
      propertyType: propertyType as PropertyType,
      annualIncome,
    },
  };
}

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
]);

export const ALLOWED_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg"]);

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
