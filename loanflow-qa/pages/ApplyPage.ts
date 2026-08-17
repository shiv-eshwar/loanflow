import type { Locator, Page } from "@playwright/test";
import type { ApplicationPayload } from "../fixtures/application-factory";

export class ApplyPage {
  constructor(private readonly page: Page) {}

  private field(name: string): Locator {
    return this.page.locator(`[name="${name}"]`);
  }

  async goto(): Promise<void> {
    await this.page.goto("/apply");
  }

  async fill(payload: ApplicationPayload): Promise<void> {
    await this.field("borrowerName").fill(payload.borrowerName);
    await this.field("borrowerEmail").fill(payload.borrowerEmail);
    await this.field("loanAmount").fill(String(payload.loanAmount));
    await this.field("annualIncome").fill(String(payload.annualIncome));
    if (payload.propertyType) {
      const option = this.page.locator(
        `select[name="propertyType"] option[value="${payload.propertyType}"]`,
      );
      if ((await option.count()) > 0) {
        await this.field("propertyType").selectOption(payload.propertyType);
      }
    }
  }

  async submit(): Promise<void> {
    await this.page.getByRole("button", { name: "Continue to documents" }).click();
  }

  async errorText(): Promise<string> {
    return (await this.page.locator("p.text-red-600").textContent()) ?? "";
  }

  async isOnApply(): Promise<boolean> {
    return /\/apply\/?$/.test(new URL(this.page.url()).pathname);
  }

  async isLoanAmountValid(): Promise<boolean> {
    return this.field("loanAmount").evaluate(
      (el) => (el as HTMLInputElement).validity.valid,
    );
  }

  async propertyTypeValues(): Promise<string[]> {
    return this.page
      .locator('select[name="propertyType"] option')
      .evaluateAll((els) =>
        els
          .map((el) => (el as HTMLOptionElement).value)
          .filter((value) => value.length > 0),
      );
  }
}
