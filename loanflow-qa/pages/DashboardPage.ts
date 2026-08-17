import type { Page } from "@playwright/test";

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async expectLoaded(): Promise<void> {
    await this.page.getByRole("heading", { name: "Applications" }).waitFor();
  }

  async goto(): Promise<void> {
    await this.page.goto("/dashboard");
  }

  async gotoWithStoredToken(token: string): Promise<void> {
    await this.page.goto("/login");
    await this.page.evaluate((value) => {
      localStorage.setItem("loanflow_token", value);
    }, token);
    await this.page.goto("/dashboard");
  }

  async filterBy(status: string): Promise<void> {
    const waiting = this.page.waitForResponse(
      (res) =>
        res.url().includes("/api/applications") &&
        res.request().method() === "GET" &&
        res.ok(),
    );
    await this.page.locator('select[name="status"]').selectOption(status);
    await waiting;
  }

  async rowCount(): Promise<number> {
    if (await this.page.getByText("No applications").count()) {
      return 0;
    }
    return this.page.locator("tbody tr").count();
  }

  async hasBorrower(name: string): Promise<boolean> {
    return (await this.page.getByRole("link", { name }).count()) > 0;
  }

  async waitForError(): Promise<string> {
    const el = this.page.locator("p.text-red-600");
    await el.waitFor();
    return (await el.textContent()) ?? "";
  }

  async errorText(): Promise<string> {
    return (await this.page.locator("p.text-red-600").textContent()) ?? "";
  }

  async expectRedirectedToLogin(): Promise<void> {
    await this.page.waitForURL(/\/login/);
  }

  async isOnLogin(): Promise<boolean> {
    return this.page.url().includes("/login");
  }

  async hasManualDecisionControl(): Promise<boolean> {
    const approve = this.page.getByRole("button", { name: /approve/i });
    const reject = this.page.getByRole("button", { name: /reject/i });
    return (await approve.count()) + (await reject.count()) > 0;
  }
}
