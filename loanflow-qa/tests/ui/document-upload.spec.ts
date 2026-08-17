import path from "path";
import { expect, test } from "@playwright/test";
import {
  invalidTextFile,
  oversizedPdf,
  valid,
} from "../../fixtures/application-factory";
import { qaUser } from "../../fixtures/test-users";
import { ApplyPage } from "../../pages/ApplyPage";
import { DashboardPage } from "../../pages/DashboardPage";
import { DocumentsPage } from "../../pages/DocumentsPage";
import { LoginPage } from "../../pages/LoginPage";

const tinyPdf = path.join(__dirname, "../../fixtures/files/tiny.pdf");

async function openDocuments(page: import("@playwright/test").Page) {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(qaUser);
  await new DashboardPage(page).expectLoaded();

  const apply = new ApplyPage(page);
  await apply.goto();
  await apply.fill(valid());
  await apply.submit();

  const documents = new DocumentsPage(page);
  await documents.expectLoaded();
  return documents;
}

test.describe("document upload", () => {
  test("rejects wrong file type", async ({ page }) => {
    const documents = await openDocuments(page);
    await documents.upload(invalidTextFile());
    const error = await documents.waitForError();
    expect(error.toLowerCase()).toContain("pdf");
  });

  test("rejects oversized file", async ({ page }) => {
    const documents = await openDocuments(page);
    await documents.upload(oversizedPdf());
    const error = await documents.waitForError();
    expect(error.toLowerCase()).toContain("5mb");
  });

  test("lists a valid PDF after upload", async ({ page }) => {
    const documents = await openDocuments(page);
    await documents.upload(tinyPdf);
    await documents.waitForListedFile("tiny.pdf");
    expect(await documents.listedFilenames()).toContain("tiny.pdf");
  });
});
