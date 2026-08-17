import { expect, test } from "@playwright/test";
import { expiredAccessToken } from "../../fixtures/expired-token";
import { invalidPassword, qaUser } from "../../fixtures/test-users";
import { DashboardPage } from "../../pages/DashboardPage";
import { LoginPage } from "../../pages/LoginPage";

test.describe("auth", () => {
  test("@smoke valid login lands on dashboard", { tag: "@smoke" }, async ({
    page,
  }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(qaUser);
    const dashboard = new DashboardPage(page);
    await dashboard.expectLoaded();
    expect(page.url()).toContain("/dashboard");
  });

  test("invalid password shows an error", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login({ email: qaUser.email, password: invalidPassword });
    const error = await login.waitForError();
    expect(error.toLowerCase()).toContain("invalid");
  });

  test("protected dashboard redirects when logged out", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.expectRedirectedToLogin();
  });

  test("expired token does not load applications", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.gotoWithStoredToken(expiredAccessToken());
    const error = await dashboard.waitForError();
    expect(error.toLowerCase()).toContain("unauthorized");
  });
});
