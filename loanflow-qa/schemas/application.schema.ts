import { z } from "zod";

export const propertyTypeSchema = z.enum([
  "single_family",
  "condo",
  "townhouse",
  "multi_family",
]);

export const statusSchema = z.enum([
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
]);

export const isoDateTimeSchema = z.string().datetime();

export const documentSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  uploadedAt: isoDateTimeSchema,
});

export const applicationSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  borrowerName: z.string().min(1),
  borrowerEmail: z.string().email(),
  loanAmount: z.number().positive(),
  propertyType: propertyTypeSchema,
  annualIncome: z.number().positive(),
  status: statusSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  documents: z.array(documentSchema).optional(),
});

export const applicationListSchema = z.object({
  items: z.array(applicationSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});

export const statusPayloadSchema = z.object({
  id: z.string().min(1),
  status: statusSchema,
  updatedAt: isoDateTimeSchema,
});

export const loginSchema = z.object({
  token: z.string().min(1),
  user: z.object({
    id: z.string().min(1),
    email: z.string().email(),
    name: z.string().min(1),
  }),
});

export const errorSchema = z.object({
  error: z.string().min(1),
  details: z.record(z.string()).optional(),
  from: statusSchema.optional(),
  to: statusSchema.optional(),
});
