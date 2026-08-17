import type { Locator, Page } from "@playwright/test";
import { qaUser, type TestUser } from "../fixtures/test-users";

export class LoginPage {
  constructor(private readonly page: Page) {}

  private emailInput(): Locator {
    return this.page.locator('input[name="email"]');
  }

  private passwordInput(): Locator {
    return this.page.locator('input[name="password"]');
  }

  async goto(): Promise<void> {
    await this.page.goto("/login");
  }

  async login(user: TestUser = qaUser): Promise<void> {
    await this.emailInput().fill(user.email);
    await this.passwordInput().fill(user.password);
    await this.page.getByRole("button", { name: "Sign in" }).click();
  }

  async waitForError(): Promise<string> {
    const el = this.page.locator("p.text-red-600");
    await el.waitFor();
    return (await el.textContent()) ?? "";
  }

  async errorText(): Promise<string> {
    return (await this.page.locator("p.text-red-600").textContent()) ?? "";
  }

  async isOnLogin(): Promise<boolean> {
    return this.page.url().includes("/login");
  }
}
