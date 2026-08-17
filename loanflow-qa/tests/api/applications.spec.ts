import path from "path";
import { expect, test } from "@playwright/test";
import {
  invalidAmount,
  invalidPropertyType,
  invalidTextFile,
  missingRequired,
  oversizedPdf,
  valid,
} from "../../fixtures/application-factory";
import { otherUser, qaUser } from "../../fixtures/test-users";
import {
  applicationListSchema,
  applicationSchema,
  documentSchema,
  errorSchema,
  statusPayloadSchema,
} from "../../schemas/application.schema";
import { LoanFlowApi } from "../../utils/api-client";
import { assertSchema } from "../../utils/assert-schema";

const tinyPdf = path.join(__dirname, "../../fixtures/files/tiny.pdf");
const UNKNOWN_ID = "nonexistent-application-id";

async function createDraft(api: LoanFlowApi) {
  const token = await api.loginToken(qaUser);
  const res = await api.createApplication(token, valid());
  expect(res.status()).toBe(201);
  const app = assertSchema(applicationSchema, await res.json());
  return { token, app };
}

test.describe("API applications", () => {
  test("@smoke create application", { tag: "@smoke" }, async ({ request }) => {
    const api = new LoanFlowApi(request);
    const token = await api.loginToken(qaUser);
    const res = await api.createApplication(token, valid());
    expect(res.status()).toBe(201);
    const app = assertSchema(applicationSchema, await res.json());
    expect(app.status).toBe("draft");
  });

  test("create rejects invalid payloads", async ({ request }) => {
    const api = new LoanFlowApi(request);
    const token = await api.loginToken(qaUser);
    for (const payload of [invalidAmount(), invalidPropertyType(), missingRequired()]) {
      const res = await api.createApplication(token, payload);
      expect(res.status()).toBe(400);
      assertSchema(errorSchema, await res.json());
    }
  });

  test("create requires auth", async ({ request }) => {
    const api = new LoanFlowApi(request);
    const res = await api.createApplication(null, valid());
    expect(res.status()).toBe(401);
    assertSchema(errorSchema, await res.json());
  });

  test("get application by id", async ({ request }) => {
    const api = new LoanFlowApi(request);
    const { token, app } = await createDraft(api);
    const res = await api.getApplication(token, app.id);
    expect(res.status()).toBe(200);
    assertSchema(applicationSchema, await res.json());
  });

  test("get unknown application is 404", async ({ request }) => {
    const api = new LoanFlowApi(request);
    const token = await api.loginToken(qaUser);
    const res = await api.getApplication(token, UNKNOWN_ID);
    expect(res.status()).toBe(404);
    assertSchema(errorSchema, await res.json());
  });

  test("get application requires auth", async ({ request }) => {
    const api = new LoanFlowApi(request);
    const { app } = await createDraft(api);
    const res = await api.getApplication(null, app.id);
    expect(res.status()).toBe(401);
    assertSchema(errorSchema, await res.json());
  });

  test("get application forbids the other user", async ({ request }) => {
    const api = new LoanFlowApi(request);
    const { app } = await createDraft(api);
    const otherToken = await api.loginToken(otherUser);
    const res = await api.getApplication(otherToken, app.id);
    expect(res.status()).toBe(403);
    assertSchema(errorSchema, await res.json());
  });

  test("list applications is paginated and owner-scoped", async ({ request }) => {
    const api = new LoanFlowApi(request);
    const { token, app } = await createDraft(api);
    const res = await api.listApplications(token, { page: 1, pageSize: 50 });
    expect(res.status()).toBe(200);
    const body = assertSchema(applicationListSchema, await res.json());
    expect(body.page).toBe(1);
    expect(body.items.some((item) => item.id === app.id)).toBe(true);

    const otherToken = await api.loginToken(otherUser);
    const otherList = await api.listApplications(otherToken, {
      page: 1,
      pageSize: 50,
    });
    expect(otherList.status()).toBe(200);
    const otherBody = assertSchema(applicationListSchema, await otherList.json());
    expect(otherBody.items.some((item) => item.id === app.id)).toBe(false);
  });

  test("list rejects invalid status filter", async ({ request }) => {
    const api = new LoanFlowApi(request);
    const token = await api.loginToken(qaUser);
    const res = await api.listApplications(token, { status: "not-a-status" });
    expect(res.status()).toBe(400);
    assertSchema(errorSchema, await res.json());
  });

  test("list requires auth", async ({ request }) => {
    const api = new LoanFlowApi(request);
    const res = await api.listApplications(null);
    expect(res.status()).toBe(401);
    assertSchema(errorSchema, await res.json());
  });

  test("upload PDF document", async ({ request }) => {
    const api = new LoanFlowApi(request);
    const { token, app } = await createDraft(api);
    const res = await api.uploadDocument(token, app.id, tinyPdf);
    expect(res.status()).toBe(201);
    const doc = assertSchema(documentSchema, await res.json());
    expect(doc.filename).toBe("tiny.pdf");
  });

  test("upload rejects wrong type, oversized, and missing file", async ({
    request,
  }) => {
    const api = new LoanFlowApi(request);
    const { token, app } = await createDraft(api);

    const wrongType = await api.uploadDocument(token, app.id, invalidTextFile());
    expect(wrongType.status()).toBe(400);
    assertSchema(errorSchema, await wrongType.json());

    const oversized = await api.uploadDocument(token, app.id, oversizedPdf());
    expect(oversized.status()).toBe(400);
    assertSchema(errorSchema, await oversized.json());

    const missing = await api.uploadDocumentMissingFile(token, app.id);
    expect(missing.status()).toBe(400);
    assertSchema(errorSchema, await missing.json());
  });

  test("upload requires auth and forbids the other user", async ({ request }) => {
    const api = new LoanFlowApi(request);
    const { app } = await createDraft(api);

    const unauth = await api.uploadDocument(null, app.id, tinyPdf);
    expect(unauth.status()).toBe(401);
    assertSchema(errorSchema, await unauth.json());

    const otherToken = await api.loginToken(otherUser);
    const forbidden = await api.uploadDocument(otherToken, app.id, tinyPdf);
    expect(forbidden.status()).toBe(403);
    assertSchema(errorSchema, await forbidden.json());
  });

  test("legal status transition draft → submitted", async ({ request }) => {
    const api = new LoanFlowApi(request);
    const { token, app } = await createDraft(api);
    const res = await api.putStatus(token, app.id, "submitted");
    expect(res.status()).toBe(200);
    const updated = assertSchema(applicationSchema, await res.json());
    expect(updated.status).toBe("submitted");
  });

  test("illegal status transitions return 409", async ({ request }) => {
    const api = new LoanFlowApi(request);
    const { token, app } = await createDraft(api);

    for (const to of ["approved", "under_review"] as const) {
      const res = await api.putStatus(token, app.id, to);
      expect(res.status()).toBe(409);
      const body = assertSchema(errorSchema, await res.json());
      expect(body.from).toBe("draft");
      expect(body.to).toBe(to);
    }

    const submitted = await api.putStatus(token, app.id, "submitted");
    expect(submitted.status()).toBe(200);

    for (const to of ["approved", "draft"] as const) {
      const res = await api.putStatus(token, app.id, to);
      expect(res.status()).toBe(409);
      assertSchema(errorSchema, await res.json());
    }

    const list = await api.listApplications(token, {
      status: "approved",
      pageSize: 50,
    });
    const approved = assertSchema(applicationListSchema, await list.json())
      .items[0];
    expect(approved).toBeTruthy();
    const fromApproved = await api.putStatus(token, approved.id, "submitted");
    expect(fromApproved.status()).toBe(409);
    assertSchema(errorSchema, await fromApproved.json());
  });

  test("put status rejects junk status and unauthenticated / wrong-user", async ({
    request,
  }) => {
    const api = new LoanFlowApi(request);
    const { token, app } = await createDraft(api);

    const junk = await api.putStatus(token, app.id, "shipped");
    expect(junk.status()).toBe(400);
    assertSchema(errorSchema, await junk.json());

    const unauth = await api.putStatus(null, app.id, "submitted");
    expect(unauth.status()).toBe(401);
    assertSchema(errorSchema, await unauth.json());

    const otherToken = await api.loginToken(otherUser);
    const forbidden = await api.putStatus(otherToken, app.id, "submitted");
    expect(forbidden.status()).toBe(403);
    assertSchema(errorSchema, await forbidden.json());
  });

  test("get status happy path, 404, unauth, wrong-user", async ({ request }) => {
    const api = new LoanFlowApi(request);
    const { token, app } = await createDraft(api);

    const ok = await api.getStatus(token, app.id);
    expect(ok.status()).toBe(200);
    const payload = assertSchema(statusPayloadSchema, await ok.json());
    expect(payload.id).toBe(app.id);
    expect(payload.status).toBe("draft");

    const missing = await api.getStatus(token, UNKNOWN_ID);
    expect(missing.status()).toBe(404);
    assertSchema(errorSchema, await missing.json());

    const unauth = await api.getStatus(null, app.id);
    expect(unauth.status()).toBe(401);
    assertSchema(errorSchema, await unauth.json());

    const otherToken = await api.loginToken(otherUser);
    const forbidden = await api.getStatus(otherToken, app.id);
    expect(forbidden.status()).toBe(403);
    assertSchema(errorSchema, await forbidden.json());
  });
});
