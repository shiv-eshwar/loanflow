# LoanFlow

A small mortgage loan-origination app plus a Playwright TypeScript suite that tests it — built as a portfolio piece for QA automation (UI + API, CI, fintech lifecycle).

Borrowers apply, upload documents, and watch underwriting move through a real state machine:

`draft → submitted → under_review → approved | rejected`

The app stays small on purpose. Depth is in the tests: Page Object Model, schema-checked API responses, explicit polling for async underwriting, GitHub Actions, and a LangGraph agent that triages CI failures.

| Metric | Value |
|---|---|
| Playwright tests | **42** (14 UI + 28 API) |
| `@smoke` | 4 tests, ~9s locally |
| Last regression on `main` | green, **1m48s** ([run 32051106630](https://github.com/shiv-eshwar/loanflow/actions/runs/32051106630)) |

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

Both publish the Playwright HTML report as an artifact. Failed runs also upload JSON + traces and run the **failure-triage agent** (files issues labeled `triage:flaky`, `triage:real_regression`, or `triage:environment`). `main` requires a PR with the **Smoke** check green. See [docs/ci.md](docs/ci.md).

## Failure triage

```bash
cd loanflow-qa
npm run triage -- --report agent/triage/fixtures/sample-failed-report.json
npm run triage -- --report agent/triage/fixtures/sample-flaky-report.json
npm run triage -- --report agent/triage/fixtures/sample-environment-report.json
```

Dry-run prints the issue body. `--file-issue` posts to GitHub using `GITHUB_TOKEN` / `GH_TOKEN` (never hardcoded).

## Stack

Next.js, TypeScript, Express, Prisma/SQLite, Playwright, zod, GitHub Actions, LangGraph.

## Docs

- [Architecture](docs/architecture.md)
- [Test strategy](docs/test-strategy.md)
- [CI and branch protection](docs/ci.md)
