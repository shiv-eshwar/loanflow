import { expect, test } from "@playwright/test";
import { expiredAccessToken } from "../../fixtures/expired-token";
import { invalidPassword, otherUser, qaUser } from "../../fixtures/test-users";
import { valid } from "../../fixtures/application-factory";
import {
  applicationSchema,
  errorSchema,
  loginSchema,
} from "../../schemas/application.schema";
import { LoanFlowApi } from "../../utils/api-client";
import { assertSchema } from "../../utils/assert-schema";

test.describe("API auth", () => {
  test("@smoke login returns a JWT", { tag: "@smoke" }, async ({ request }) => {
    const api = new LoanFlowApi(request);
    const res = await api.login(qaUser);
    expect(res.status()).toBe(200);
    const body = assertSchema(loginSchema, await res.json());
    expect(body.user.email).toBe(qaUser.email);
  });

  test("login rejects missing fields", async ({ request }) => {
    const api = new LoanFlowApi(request);
    const res = await api.login(qaUser, { email: "", password: "" });
    expect(res.status()).toBe(400);
    assertSchema(errorSchema, await res.json());
  });

  test("login rejects invalid password", async ({ request }) => {
    const api = new LoanFlowApi(request);
    const res = await api.login(qaUser, { password: invalidPassword });
    expect(res.status()).toBe(401);
    assertSchema(errorSchema, await res.json());
  });

  test("protected routes require a token", async ({ request }) => {
    const api = new LoanFlowApi(request);
    const res = await api.listApplications(null);
    expect(res.status()).toBe(401);
    assertSchema(errorSchema, await res.json());
  });

  test("expired token is rejected", async ({ request }) => {
    const api = new LoanFlowApi(request);
    const res = await api.listApplications(expiredAccessToken());
    expect(res.status()).toBe(401);
    assertSchema(errorSchema, await res.json());
  });

  test("wrong user cannot read another user's application", async ({
    request,
  }) => {
    const api = new LoanFlowApi(request);
    const qaToken = await api.loginToken(qaUser);
    const created = await api.createApplication(qaToken, valid());
    expect(created.status()).toBe(201);
    const app = assertSchema(applicationSchema, await created.json());

    const otherToken = await api.loginToken(otherUser);
    const res = await api.getApplication(otherToken, app.id);
    expect(res.status()).toBe(403);
    assertSchema(errorSchema, await res.json());
  });
});
