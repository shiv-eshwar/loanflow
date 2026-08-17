import type { ApplicationStatus } from "@prisma/client";

const ALLOWED: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: ["submitted"],
  submitted: ["under_review"],
  under_review: ["approved", "rejected"],
  approved: [],
  rejected: [],
};

export function canTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  return ALLOWED[from].includes(to);
}

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return value in ALLOWED;
}
