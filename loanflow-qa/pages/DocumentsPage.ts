import type { Page } from "@playwright/test";
import type { UploadFile } from "../fixtures/application-factory";

export class DocumentsPage {
  constructor(private readonly page: Page) {}

  async expectLoaded(): Promise<void> {
    await this.page.getByRole("heading", { name: "Upload documents" }).waitFor();
  }

  async upload(file: string | UploadFile): Promise<void> {
    const input = this.page.locator('input[name="file"]');
    if (typeof file === "string") {
      await input.setInputFiles(file);
    } else {
      await input.setInputFiles({
        name: file.name,
        mimeType: file.mimeType,
        buffer: file.buffer,
      });
    }
    await this.page.getByRole("button", { name: "Upload" }).click();
  }

  async submitApplication(): Promise<void> {
    await this.page.getByRole("button", { name: "Submit application" }).click();
  }

  async waitForError(): Promise<string> {
    const el = this.page.locator("p.text-red-600");
    await el.waitFor();
    return (await el.textContent()) ?? "";
  }

  async errorText(): Promise<string> {
    return (await this.page.locator("p.text-red-600").textContent()) ?? "";
  }

  async waitForListedFile(name: string): Promise<void> {
    await this.page.locator("ul li").filter({ hasText: name }).waitFor();
  }

  async listedFilenames(): Promise<string> {
    const items = this.page.locator("ul li");
    return (await items.allTextContents()).join("\n");
  }
}
