import path from "path";
import { expect, test } from "@playwright/test";
import {
  invalidAmount,
  invalidPropertyType,
  missingRequired,
  PROPERTY_TYPE_VALUES,
  valid,
} from "../../fixtures/application-factory";
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
  const dashboard = new DashboardPage(page);
  await dashboard.expectLoaded();
}

test.describe("apply flow", () => {
  test("@smoke apply → upload → poll to approved", { tag: "@smoke" }, async ({
    page,
  }) => {
    const payload = valid();
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
    await status.waitUntilStatus("approved");
  });

  test("required fields block submit", async ({ page }) => {
    await loginAsQa(page);
    const apply = new ApplyPage(page);
    await apply.goto();
    await apply.fill(missingRequired());
    await apply.submit();
    expect(await apply.isOnApply()).toBe(true);
  });

  test("invalid loan amount is rejected", async ({ page }) => {
    await loginAsQa(page);
    const apply = new ApplyPage(page);
    await apply.goto();
    await apply.fill(invalidAmount());
    await apply.submit();
    expect(await apply.isLoanAmountValid()).toBe(false);
  });

  test("property type select only exposes legal enums", async ({ page }) => {
    await loginAsQa(page);
    const apply = new ApplyPage(page);
    await apply.goto();
    const values = await apply.propertyTypeValues();
    expect(values).toEqual([...PROPERTY_TYPE_VALUES]);
    expect(values).not.toContain(invalidPropertyType().propertyType);
  });
});
