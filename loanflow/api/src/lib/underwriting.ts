import type { Application } from "@prisma/client";
import { prisma } from "./prisma";

const DECISION_OFFSET_MS = 1000;

export function randomDelayMs(): number {
  return 1000 + Math.floor(Math.random() * 4001);
}

export function pickDecision(
  loanAmount: number,
  annualIncome: number,
): "approved" | "rejected" {
  return loanAmount <= annualIncome * 4 ? "approved" : "rejected";
}

export async function maybeAdvanceUnderwriting(
  app: Application,
): Promise<Application> {
  if (app.status !== "submitted" && app.status !== "under_review") {
    return app;
  }
  if (!app.underwritingStartedAt || app.underwritingDelayMs == null) {
    return app;
  }

  const elapsed = Date.now() - app.underwritingStartedAt.getTime();
  const delay = app.underwritingDelayMs;

  if (app.status === "submitted" && elapsed >= delay) {
    return prisma.application.update({
      where: { id: app.id },
      data: { status: "under_review" },
    });
  }

  if (app.status === "under_review" && elapsed >= delay + DECISION_OFFSET_MS) {
    return prisma.application.update({
      where: { id: app.id },
      data: { status: pickDecision(app.loanAmount, app.annualIncome) },
    });
  }

  return app;
}
