# LoanFlow

A small mortgage loan-origination app plus a Playwright TypeScript suite that tests it — built as a portfolio piece for QA automation (UI + API, CI, fintech lifecycle).

Borrowers apply, upload documents, and watch underwriting move through a real state machine:

`draft → submitted → under_review → approved | rejected`

The app stays small on purpose. Depth is in the tests: Page Object Model, schema-checked API responses, explicit polling for async underwriting, and GitHub Actions smoke/regression.

## Layout

| Path | What it is |
|---|---|
| [`loanflow/`](loanflow/) | Next.js UI (`:3000`) + Express API (`:4000`) + Prisma/SQLite |
| [`loanflow-qa/`](loanflow-qa/) | Playwright + TypeScript (POM, UI + API, zod schemas) |
| [`docs/`](docs/) | Architecture, test strategy, CI / branch protection |

## Run the app

```bash
cd loanflow
npm install
npm run db:seed
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000

`npm run db:seed` copies `api/.env.example` → `api/.env` if needed.

Seed users (password for both: `Password123!`):

| Email | Role |
|---|---|
| `qa@loanflow.test` | Primary tester; fixture apps in every status |
| `other@loanflow.test` | Second user for 403 authorization tests |

## Run the tests

```bash
cd loanflow-qa
npm install
npx playwright install chromium
npx playwright test tests/ui      # UI
npx playwright test tests/api     # API (hits Express on :4000)
npx playwright test --grep @smoke # critical path only
npx playwright test               # full suite
```

If the app is not already running, Playwright starts it (waits for both `:3000` and `:4000`). HTML report: `loanflow-qa/playwright-report/`.

## Why tests poll instead of sleeping

Underwriting is **intentionally delayed** (random 1–5s, then +1s to a decision). A fixed `waitForTimeout(5000)` either flakes when the delay is long or wastes time when it is short.

UI status tests call `waitForCondition` in [`loanflow-qa/utils/wait-helpers.ts`](loanflow-qa/utils/wait-helpers.ts): poll the status badge with a **timeout and backoff**, not a blind sleep.

In production I would not poll a public GET that mutates state. I would use **test hooks** driven by the same events the product uses — a webhook, an outbox table, or a stubbed underwriting worker that the suite can await. Polling is the right default when the only observable is “status changed.”

## CI

| Workflow | Trigger | What it runs |
|---|---|---|
| [`.github/workflows/smoke.yml`](.github/workflows/smoke.yml) | Pull request | `@smoke` only (fast critical path) |
| [`.github/workflows/regression.yml`](.github/workflows/regression.yml) | Push to `main` | Full suite, 3 shards |

Both publish the Playwright HTML report as an artifact. See [docs/ci.md](docs/ci.md) to require smoke on PRs (branch protection).

## Stack

Next.js, TypeScript, Express, Prisma/SQLite, Playwright, zod, GitHub Actions.

## Docs

- [Architecture](docs/architecture.md)
- [Test strategy](docs/test-strategy.md)
- [CI and branch protection](docs/ci.md)
