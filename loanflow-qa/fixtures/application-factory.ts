export type ApplicationPayload = {
  borrowerName: string;
  borrowerEmail: string;
  loanAmount: number;
  annualIncome: number;
  propertyType: string;
};

export const PROPERTY_TYPE_VALUES = [
  "single_family",
  "condo",
  "townhouse",
  "multi_family",
] as const;

let seq = 0;

function unique(prefix: string): { name: string; email: string } {
  seq += 1;
  const stamp = `${Date.now()}-${seq}`;
  return {
    name: `${prefix} ${stamp}`,
    email: `${prefix.toLowerCase().replace(/\s+/g, ".")}.${stamp}@loanflow.test`,
  };
}

export function valid(): ApplicationPayload {
  const id = unique("Valid Borrower");
  return {
    borrowerName: id.name,
    borrowerEmail: id.email,
    loanAmount: 200_000,
    annualIncome: 100_000,
    propertyType: "single_family",
  };
}

export function highLeverage(): ApplicationPayload {
  const id = unique("High Leverage");
  return {
    borrowerName: id.name,
    borrowerEmail: id.email,
    loanAmount: 500_000,
    annualIncome: 80_000,
    propertyType: "condo",
  };
}

export function invalidAmount(): ApplicationPayload {
  return { ...valid(), loanAmount: 0 };
}

export function invalidPropertyType(): ApplicationPayload {
  return { ...valid(), propertyType: "castle" };
}

export function missingRequired(): ApplicationPayload {
  return {
    borrowerName: "",
    borrowerEmail: "",
    loanAmount: 200_000,
    annualIncome: 100_000,
    propertyType: "single_family",
  };
}

export type UploadFile = {
  name: string;
  mimeType: string;
  buffer: Buffer;
};

export function oversizedPdf(): UploadFile {
  return {
    name: "oversized.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 0x25),
  };
}

export function invalidTextFile(): UploadFile {
  return {
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not a pdf"),
  };
}
