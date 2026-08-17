import type { Page } from "@playwright/test";
import { waitForCondition } from "../utils/wait-helpers";

export class StatusPage {
  constructor(private readonly page: Page) {}

  async goto(id: string): Promise<void> {
    await this.page.goto(`/applications/${id}`);
  }

  async expectLoaded(): Promise<void> {
    await this.page.getByRole("heading", { name: "Application status" }).waitFor();
  }

  async statusText(): Promise<string> {
    const badge = this.page.locator("span.inline-flex.rounded-full");
    if ((await badge.count()) === 0) return "";
    return ((await badge.first().textContent()) ?? "").trim();
  }

  async waitUntilStatus(label: string): Promise<void> {
    await waitForCondition(async () => (await this.statusText()) === label, {
      timeoutMs: 15_000,
    });
  }

  async hasManualDecisionControl(): Promise<boolean> {
    const approve = this.page.getByRole("button", { name: /approve/i });
    const reject = this.page.getByRole("button", { name: /reject/i });
    return (await approve.count()) + (await reject.count()) > 0;
  }
}
