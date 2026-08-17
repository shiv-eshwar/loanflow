import path from "path";
import { expect, test } from "@playwright/test";
import { valid } from "../../fixtures/application-factory";
import { qaUser } from "../../fixtures/test-users";
import {
  applicationListSchema,
  applicationSchema,
  documentSchema,
  errorSchema,
  loginSchema,
  propertyTypeSchema,
  statusPayloadSchema,
  statusSchema,
} from "../../schemas/application.schema";
import { LoanFlowApi } from "../../utils/api-client";
import { assertSchema } from "../../utils/assert-schema";

const tinyPdf = path.join(__dirname, "../../fixtures/files/tiny.pdf");

test.describe("API schema validation", () => {
  test("login payload types", async ({ request }) => {
    const api = new LoanFlowApi(request);
    const res = await api.login(qaUser);
    expect(res.status()).toBe(200);
    const body = assertSchema(loginSchema, await res.json());
    expect(typeof body.token).toBe("string");
    expect(typeof body.user.id).toBe("string");
    expect(body.user.email).toContain("@");
  });

  test("application enums and numeric types", async ({ request }) => {
    const api = new LoanFlowApi(request);
    const token = await api.loginToken(qaUser);
    const res = await api.createApplication(token, valid());
    expect(res.status()).toBe(201);
    const app = assertSchema(applicationSchema, await res.json());
    expect(propertyTypeSchema.safeParse(app.propertyType).success).toBe(true);
    expect(statusSchema.safeParse(app.status).success).toBe(true);
    expect(typeof app.loanAmount).toBe("number");
    expect(typeof app.annualIncome).toBe("number");
    expect(Number.isFinite(app.loanAmount)).toBe(true);
  });

  test("list envelope types", async ({ request }) => {
    const api = new LoanFlowApi(request);
    const token = await api.loginToken(qaUser);
    const res = await api.listApplications(token, { page: 1, pageSize: 10 });
    expect(res.status()).toBe(200);
    const body = assertSchema(applicationListSchema, await res.json());
    expect(typeof body.total).toBe("number");
    for (const item of body.items) {
      expect(statusSchema.safeParse(item.status).success).toBe(true);
    }
  });

  test("document and status payloads", async ({ request }) => {
    const api = new LoanFlowApi(request);
    const token = await api.loginToken(qaUser);
    const created = await api.createApplication(token, valid());
    const app = assertSchema(applicationSchema, await created.json());

    const uploaded = await api.uploadDocument(token, app.id, tinyPdf);
    expect(uploaded.status()).toBe(201);
    const doc = assertSchema(documentSchema, await uploaded.json());
    expect(typeof doc.sizeBytes).toBe("number");

    const statusRes = await api.getStatus(token, app.id);
    expect(statusRes.status()).toBe(200);
    const status = assertSchema(statusPayloadSchema, await statusRes.json());
    expect(statusSchema.safeParse(status.status).success).toBe(true);
  });

  test("409 error includes from/to status enums", async ({ request }) => {
    const api = new LoanFlowApi(request);
    const token = await api.loginToken(qaUser);
    const created = await api.createApplication(token, valid());
    const app = assertSchema(applicationSchema, await created.json());
    const res = await api.putStatus(token, app.id, "approved");
    expect(res.status()).toBe(409);
    const body = assertSchema(errorSchema, await res.json());
    expect(statusSchema.safeParse(body.from).success).toBe(true);
    expect(statusSchema.safeParse(body.to).success).toBe(true);
  });
});
