# LoanFlow QA

QA automation framework for a mortgage loan-origination platform, built to target the **QA Automation Intern (FinacPlus / Toorak Capital)** role. Two parts: (1) a minimal loan-origination web app to serve as the test target, (2) a Playwright+TypeScript automation suite + CI + AI-powered failure-triage agent testing it.

## Why this project exists
JD wants: Playwright/JS automation, UI+API testing, CI/CD integration, debugging/observability, fintech domain fluency (loan lifecycle), ownership mindset over "just execution." This project demonstrates every one of those directly instead of claiming them on a resume. The triage agent is the differentiator — it reuses my actual background (LangGraph/CrewAI multi-agent systems, RAG) to solve a real QA problem (flaky-vs-real failure classification), not a generic ToDo-app Playwright clone.

## Scope (deliberately small, deliberately deep)
Do not over-build the app. It exists only to be tested. 3-4 pages, 6-8 endpoints, one Postgres/SQLite table set. All depth goes into the test framework and CI, not the app.

## Part 1 — Target App ("LoanFlow")
**Frontend:** Next.js (App Router), TypeScript, minimal Tailwind styling.
- `/apply` — loan application form (borrower info, loan amount, property type, income) → client + server validation
- `/apply/[id]/documents` — document upload step (mock file upload, accepts PDF/JPG, size/type validation)
- `/applications/[id]` — status page: `draft → submitted → under_review → approved/rejected`, polls backend every N seconds
- `/dashboard` — list of applications (auth-gated), filter by status

**Backend:** Node/Express (or Next.js API routes — pick Express if I want a cleanly separate API surface for API-only tests), TypeScript.
- `POST /api/auth/login` → JWT
- `POST /api/applications` — create application
- `GET /api/applications/:id`
- `GET /api/applications` — list (auth required, paginated)
- `POST /api/applications/:id/documents` — upload (multipart)
- `PUT /api/applications/:id/status` — transition status (state-machine validated: no skipping `draft → approved`)
- `GET /api/applications/:id/status` — polled by frontend, simulate async underwriting decision after a delay (this is the intentional flakiness surface for the test suite to handle correctly)

**DB:** SQLite via Prisma (zero-setup, fine for a portfolio project). Tables: `users`, `applications`, `documents`.

**Auth:** simple JWT, one seeded test user + seeded fixture applications for deterministic test runs.

## Part 2 — Automation Framework ("loanflow-qa")
Separate repo (or `/qa` subfolder — separate repo is cleaner for portfolio visibility). Playwright + TypeScript.

**Structure:**
```
loanflow-qa/
  playwright.config.ts
  tests/
    ui/
      apply-flow.spec.ts
      document-upload.spec.ts
      status-tracking.spec.ts
      auth.spec.ts
    api/
      applications.spec.ts
      auth.spec.ts
      schema-validation.spec.ts
  pages/                    # Page Object Model
    ApplyPage.ts
    DocumentsPage.ts
    StatusPage.ts
    DashboardPage.ts
  fixtures/
    test-users.ts
    application-factory.ts  # generates valid/invalid payloads
  schemas/                  # JSON schemas (zod or ajv) for API response validation
    application.schema.ts
  utils/
    api-client.ts
    wait-helpers.ts         # explicit polling/retry helpers for async status, documented
  agent/
    triage/                 # AI failure-triage agent, see below
  .github/workflows/
    smoke.yml               # runs on every PR
    regression.yml          # runs on merge to main
```

**UI test coverage:**
- Happy path: full application → upload → poll to approved
- Form validation: required fields, invalid loan amount, invalid property type
- Auth: protected routes redirect, invalid login, expired token
- Status transitions: verify UI reflects state machine correctly, no illegal transitions surfaced

**API test coverage:**
- Status codes for all endpoints (2xx/4xx/401/403/404/422)
- Schema validation on every response (zod/ajv) — not just "field exists," but types and enums
- State-machine enforcement: reject illegal status transitions server-side, assert 409/400
- Auth: token required, expired token, wrong-user access to another user's application (authorization, not just authentication)
- Boundary/negative cases: oversized upload, wrong file type, missing multipart fields

**Flakiness handling (explicit, documented — this is a JD callout: "test stability issues"):**
- The async underwriting status endpoint has a randomized delay (1-5s) by design
- Tests use explicit polling with timeout + backoff via `wait-helpers.ts`, never blind `waitForTimeout`
- README section: "Why this test used polling instead of a fixed sleep, and what I'd change for a production suite (webhook/event-driven test hooks)"

## Part 3 — CI/CD
GitHub Actions:
- `smoke.yml`: triggered on PR, runs a tagged `@smoke` subset (critical path only), ~2 min budget
- `regression.yml`: triggered on merge to `main`, runs full suite, sharded across 2-3 jobs
- HTML report (Playwright's built-in) published as a workflow artifact; optionally Allure if time allows
- PR check must pass before merge — branch protection rule enabled on the repo

## Part 4 — AI Failure-Triage Agent (the differentiator)
Small LangGraph (or CrewAI) agent, run as a post-CI-failure step.
- **Input:** Playwright JSON report + trace files from a failed run
- **Classify:** flaky (passed on retry, timing-related) vs. real regression vs. environment/infra issue
- **For real regressions:** extract failing assertion, relevant stack trace, and diff against last-known-good run; draft a structured bug report (repro steps, expected vs actual, suspected commit range)
- **Action:** auto-file as a GitHub Issue via API, tagged by classification
- **Stretch:** lightweight RAG over past filed issues so it flags "resembles issue #N" when a similar failure recurs

This is the one piece of the JD's "High-Quality Signals" list ("curiosity about how systems fail, how to improve test reliability, how to reduce defects proactively") that I'm not claiming — I built the tool that does it.

## Build order (do not reorder — each phase must be solid before the next)
1. Target app skeleton (frontend + backend + DB), deployed locally, manually verified
2. Playwright UI suite against the app (POM structure from day 1, not retrofitted)
3. Playwright API suite + schema validation
4. GitHub Actions CI (smoke + regression)
5. README, architecture diagram, test strategy doc
6. AI triage agent (only after 1-5 are solid — it's the differentiator, not the foundation)

## Interview narrative to prep alongside the build
- Be able to explain *why* Page Object Model over flat scripts (maintainability, one place to fix a selector)
- Be able to explain the flakiness-handling decision (polling vs sleep) unprompted
- Be able to walk through one API test's schema validation line by line
- Bridge line: "My background is multi-agent orchestration and RAG — I used it to reduce the manual triage burden that usually falls on QA, instead of just writing tests and hoping."
- Have one honest metric ready (e.g., number of test cases, CI run time, flaky-rate reduction from a real before/after)

## Tech stack summary
Next.js, TypeScript, Express, Prisma/SQLite, Playwright, zod/ajv, GitHub Actions, LangGraph or CrewAI (triage agent), GitHub REST API (issue filing).
