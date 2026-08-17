import path from "path";
import { expect, test } from "@playwright/test";
import { highLeverage, valid } from "../../fixtures/application-factory";
import { qaUser } from "../../fixtures/test-users";
import { ApplyPage } from "../../pages/ApplyPage";
import { DashboardPage } from "../../pages/DashboardPage";
import { DocumentsPage } from "../../pages/DocumentsPage";
import { LoginPage } from "../../pages/LoginPage";
import { StatusPage } from "../../pages/StatusPage";

const tinyPdf = path.join(__dirname, "../../fixtures/files/tiny.pdf");

async function loginAsQa(page: import("@playwright/test").Page) {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(qaUser);
  await new DashboardPage(page).expectLoaded();
}

async function submitApplication(
  page: import("@playwright/test").Page,
  payload: ReturnType<typeof valid>,
) {
  await loginAsQa(page);
  const apply = new ApplyPage(page);
  await apply.goto();
  await apply.fill(payload);
  await apply.submit();
  const documents = new DocumentsPage(page);
  await documents.expectLoaded();
  await documents.upload(tinyPdf);
  await documents.submitApplication();
  const status = new StatusPage(page);
  await status.expectLoaded();
  return status;
}

test.describe("status tracking", () => {
  test("polls until approved for a qualifying loan", async ({ page }) => {
    const status = await submitApplication(page, valid());
    await status.waitUntilStatus("approved");
    expect(await status.hasManualDecisionControl()).toBe(false);
  });

  test("polls until rejected for high leverage", async ({ page }) => {
    const status = await submitApplication(page, highLeverage());
    await status.waitUntilStatus("rejected");
  });

  test("dashboard lists seed fixtures and filter; no illegal transition control", async ({
    page,
  }) => {
    await loginAsQa(page);
    const dashboard = new DashboardPage(page);
    expect(await dashboard.hasBorrower("Fixture draft")).toBe(true);
    expect(await dashboard.hasManualDecisionControl()).toBe(false);

    await dashboard.filterBy("draft");
    expect(await dashboard.hasBorrower("Fixture draft")).toBe(true);
    expect(await dashboard.hasBorrower("Fixture approved")).toBe(false);

    await dashboard.filterBy("approved");
    expect(await dashboard.hasBorrower("Fixture approved")).toBe(true);
    expect(await dashboard.hasBorrower("Fixture draft")).toBe(false);
  });
});
