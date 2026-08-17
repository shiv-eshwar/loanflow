export const PROPERTY_TYPES = [
  "single_family",
  "condo",
  "townhouse",
  "multi_family",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
] as const;

export type ApplicationStatus = (typeof STATUSES)[number];

export type DocumentRecord = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
};

export type Application = {
  id: string;
  userId: string;
  borrowerName: string;
  borrowerEmail: string;
  loanAmount: number;
  propertyType: PropertyType;
  annualIncome: number;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  documents?: DocumentRecord[];
};

export type ApplicationList = {
  items: Application[];
  page: number;
  pageSize: number;
  total: number;
};

export type StatusPayload = {
  id: string;
  status: ApplicationStatus;
  updatedAt: string;
};
