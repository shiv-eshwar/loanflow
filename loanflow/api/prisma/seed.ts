import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
] as const;

async function main() {
  await prisma.document.deleteMany();
  await prisma.application.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const qa = await prisma.user.create({
    data: {
      email: "qa@loanflow.test",
      passwordHash,
      name: "QA Tester",
    },
  });

  const other = await prisma.user.create({
    data: {
      email: "other@loanflow.test",
      passwordHash,
      name: "Other User",
    },
  });

  for (const status of STATUSES) {
    await prisma.application.create({
      data: {
        userId: qa.id,
        borrowerName: `Fixture ${status}`,
        borrowerEmail: `fixture.${status}@loanflow.test`,
        loanAmount: 250000,
        propertyType: "single_family",
        annualIncome: 120000,
        status,
      },
    });
  }

  await prisma.application.create({
    data: {
      userId: other.id,
      borrowerName: "Other Borrower",
      borrowerEmail: "other.borrower@loanflow.test",
      loanAmount: 180000,
      propertyType: "condo",
      annualIncome: 90000,
      status: "draft",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
