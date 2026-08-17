# LoanFlow

Loan origination platform with a Playwright QA framework around it.

Borrowers apply, upload documents, and track underwriting as the application moves through a real state machine:

`draft → submitted → under_review → approved | rejected`

The app exists to be tested. Depth goes into the suite: UI + API coverage, schema-checked responses, CI, and an AI agent that classifies failures as flaky, real regression, or environment.

## Layout

| Path | What it is |
|---|---|
| `loanflow/` | Next.js UI + Express API + Prisma/SQLite |
| `loanflow-qa/` | Playwright + TypeScript (Page Object Model) |

## Run the app

```bash
cd loanflow
npm install
npm run db:seed
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000

Seed users (password: `Password123!`): `qa@loanflow.test`, `other@loanflow.test`

## Stack

Next.js, TypeScript, Express, Prisma/SQLite, Playwright, GitHub Actions, LangGraph (failure triage)
