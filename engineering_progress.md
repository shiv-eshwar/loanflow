# LoanFlow QA — Engineering Progress

**Read this file before planning or implementing anything.** Then read `what_this.md` and `cursorrules`. If this file and those two disagree, stop and flag it.

This is the living checklist. After every completed item (not just every phase), mark it done, note what landed, and record anything that blocked or changed. Do not start a later phase while an earlier phase is incomplete.

---

## How to use this file

1. Read **Current state** and **Open decisions**.
2. Confirm the requested work matches the **active phase**. If the user asks to skip ahead, flag it — do not proceed silently.
3. Implement only the next unchecked items in the active phase.
4. When an item is done: check the box, add a line under **Changelog**, update **Current state**.
5. When a phase is fully done: mark the phase `done`, set the next phase `active`, and only then plan that next phase.

Status values: `not_started` | `active` | `blocked` | `done`

---

## Current state

| Field | Value |
|---|---|
| Active phase | none (phases 1–6 complete) |
| Overall status | `done` |
| Last updated | 2026-08-17 |
| Last completed item | OpenAI zod-checked investigation brief + embeddings RAG |
| Blockers | none |

Phases 1–6 are `done`. Stretch RAG is in the triage enrich node. GitHub: https://github.com/shiv-eshwar/loanflow

---

## Open decisions (resolve before the work that depends on them)

Do not silently pick these. Confirm with the user, then move the decision into **Locked decisions**.

None open.

---

## Locked decisions

| ID | Decision |
|---|---|
| D1 | `loanflow/` + `loanflow-qa/` in this workspace; split to two GitHub repos later if needed. |
| D2 | `/login` page included (required for UI auth). |
| D3 | Express API on `:4000`, not Next.js API routes. Next.js rewrites `/api/*` to Express. |
| D4 | zod for API response schema validation. |
| D5 | LangGraph for the failure-triage agent. Stretch RAG over past `triage:*` GitHub issues. |

---

## Phase 1 — Target app (LoanFlow)

Status: `done`

Skeleton: frontend + backend + DB, runs locally, manually verified. Keep the app small. No Playwright in this phase.

### 1.1 Scaffold and data

- [x] Repo layout created (`loanflow/` app; `loanflow-qa/` folder reserved or empty until Phase 2)
- [x] TypeScript strict mode in the app
- [x] Prisma + SQLite
- [x] Tables: `users`, `applications`, `documents`
- [x] Seed: one test user + fixture applications in multiple statuses

### 1.2 Auth and API (6–8 endpoints, currently 7)

- [x] `POST /api/auth/login` → JWT
- [x] `POST /api/applications` — create (`draft`)
- [x] `GET /api/applications/:id` — owner-only
- [x] `GET /api/applications` — auth required, paginated
- [x] `POST /api/applications/:id/documents` — multipart; PDF/JPG; size/type validation
- [x] `PUT /api/applications/:id/status` — state-machine validated
- [x] `GET /api/applications/:id/status` — poll; randomized 1–5s underwriting delay

### 1.3 State machine

Legal: `draft → submitted → under_review → approved | rejected`

- [x] Legal transitions accepted
- [x] Illegal transitions rejected (skip, backwards, terminal) with 400/409
- [x] Auth: 401 unauthenticated; 403 wrong-user (authorization, not just authentication)

### 1.4 Frontend (3–4 pages + implied login)

- [x] `/apply` — borrower info, loan amount, property type, income; client + server validation
- [x] `/apply/[id]/documents` — mock upload, PDF/JPG, size/type validation
- [x] `/applications/[id]` — status page; polls every N seconds
- [x] `/dashboard` — auth-gated list; filter by status
- [x] `/login` — only if D2 is locked yes

### 1.5 Manual verification (phase exit)

- [x] App starts locally (frontend + API + DB)
- [x] Happy path clicked: login → apply → upload → status reaches approved/rejected
- [x] Illegal status transition rejected when exercised against the API
- [x] Unauthenticated dashboard redirects; wrong-user cannot read another user's application

**Phase 1 exit:** all boxes above checked. Do not start Phase 2 until then.

---

## Phase 2 — Playwright UI suite

Status: `done`

POM from day 1. No `page.locator()` in `*.spec.ts`. No `page.waitForTimeout()` for status polling.

### 2.1 Framework skeleton

- [x] `loanflow-qa/` scaffold; `playwright.config.ts`; TypeScript strict
- [x] Page objects: `ApplyPage`, `DocumentsPage`, `StatusPage`, `DashboardPage` (and login page if D2 is yes)
- [x] `fixtures/test-users.ts`
- [x] `fixtures/application-factory.ts` — all test data comes from here
- [x] `utils/wait-helpers.ts` — explicit polling with timeout + backoff

### 2.2 UI specs (`tests/ui/` only)

- [x] `apply-flow.spec.ts` — happy path apply → upload → poll to approved; `@smoke` on critical path
- [x] `document-upload.spec.ts` — type/size validation
- [x] `status-tracking.spec.ts` — UI reflects state machine; no illegal transitions surfaced
- [x] `auth.spec.ts` — protected redirect, invalid login, expired token
- [x] Form validation: required fields, invalid loan amount, invalid property type

**Phase 2 exit:** UI suite runs locally against the app. POM + wait-helpers in place. No locators in spec files.

---

## Phase 3 — Playwright API suite + schema validation

Status: `done`

### 3.1 API harness

- [x] `utils/api-client.ts`
- [x] `schemas/application.schema.ts` (and auth/list/document schemas as needed)
- [x] Every response assertion validates schema — status code alone is not enough

### 3.2 API specs (`tests/api/` only)

- [x] `auth.spec.ts` — token required, expired token, wrong-user 403
- [x] `applications.spec.ts` — status codes 2xx/4xx/401/403/404; validation is **400** (app does not return 422); illegal transitions 409
- [x] `schema-validation.spec.ts` — types and enums, not just "field exists"
- [x] Boundary: oversized upload, wrong file type, missing multipart fields
- [x] Every endpoint has: happy path + validation/negative + unauthenticated + wrong-user

**Phase 3 exit:** API suite green locally; schemas used on every response assertion.

---

## Phase 4 — GitHub Actions CI

Status: `done`

- [x] `smoke.yml` — on PR; `@smoke` only; ~2 min budget; HTML report artifact
- [x] `regression.yml` — on merge to `main`; full suite; 2–3 shards; HTML report artifact
- [x] Branch protection / PR check documented (enable on GitHub when repo exists)
- [x] Branch protection enabled on `main` (PR + required `smoke` check)

**Phase 4 exit:** both workflows exist and publish the Playwright HTML report.

Workflows are at repo-root `.github/workflows/` (monorepo; Actions only reads that path). Local `@smoke`: 4 passed in ~9s.

---

## Phase 5 — Docs

Status: `done`

- [x] README (how to run app, how to run tests, CI)
- [x] Architecture diagram
- [x] Test strategy doc
- [x] README section: why polling instead of sleep; what a production suite would use (webhook/event-driven hooks)

**Phase 5 exit:** those four artifacts exist and match what was built.

---

## Phase 6 — AI failure-triage agent

Status: `done`

- [x] Reads Playwright JSON reporter + trace files (not console logs)
- [x] Classifies only: `flaky` | `real_regression` | `environment`
- [x] Real regressions: failing assertion, stack trace, diff vs last-known-good, drafted bug report
- [x] Files GitHub Issue via REST API; token from env, never hardcoded
- [x] Stretch: RAG over past issues (“resembles issue #N”)

**Phase 6 exit:** agent runs on a failed report and can file a classified issue.

CLI: `npx tsx agent/triage/cli.ts --report …` (dry-run). `--file-issue` on CI `failure()`. Fixtures: failed → `real_regression`, flaky retry → `flaky`, ECONNREFUSED → `environment`. `--issues` fixture corpus can print **Resembles #N**. `OPENAI_API_KEY` optional (rationale + embeddings); rules still own the label.

---

## Out of scope (do not build)

- Extra pages or endpoints not in `what_this.md` (except D2 `/login` if locked)
- Extra app features “while we’re here”
- Allure (optional, only if time remains after Phase 4)
- Mixing UI and API tests in the same spec file
- Hardcoded tokens, `any` without a comment, skipping the state-machine tests

---

## Changelog

| Date | Item | Notes |
|---|---|---|
| 2026-08-17 | Tracker created | `engineering_progress.md` added. No implementation yet. Phase 1 is active but not started. Decisions D1–D5 still open. |
| 2026-08-17 | D1–D3 locked | Layout `loanflow/` + `loanflow-qa/`; `/login` yes; Express API. D4/D5 still open. Phase 1 implementation started. |
| 2026-08-17 | GitHub repo | Created public repo `shiv-eshwar/loanflow-qa`. Single repo for now (D1); split later if needed. |
| 2026-08-17 | Phase 1 scaffold | `loanflow/` npm workspaces (`web`, `api`); `loanflow-qa/` placeholder README. |
| 2026-08-17 | Prisma + seed | `users`, `applications`, `documents`. Seed users `qa@loanflow.test` and `other@loanflow.test` (Password123!), fixtures in every status. |
| 2026-08-17 | Express API | 7 endpoints, JWT, 409 illegal transitions, 401/403, 1–5s underwriting on GET /status. |
| 2026-08-17 | Next.js UI | `/login`, `/apply`, `/apply/[id]/documents`, `/applications/[id]` (2s poll), `/dashboard`. Rewrite `/api/*` → :4000. |
| 2026-08-17 | Phase 1 exit | Verified: login, create, upload PDF, poll submitted → under_review → approved; 400/401/403/409; all UI routes 200. Phase 2 active, not started. |
| 2026-08-17 | Repo rename | GitHub repo renamed to `shiv-eshwar/loanflow`. Root README added. |
| 2026-08-17 | Phase 2 scaffold | `loanflow-qa` Playwright + TS strict; POM pages; factory; wait-helpers (timeout+backoff). |
| 2026-08-17 | Phase 2 UI specs | `tests/ui`: apply-flow (@smoke), document-upload, status-tracking, auth. No locators in specs. |
| 2026-08-17 | Phase 2 exit | `npx playwright test tests/ui` — 14 passed (Chromium). Phase 3 active, not started. |
| 2026-08-17 | D4 locked | zod for API response schemas. |
| 2026-08-17 | Phase 3 API suite | `api-client`, zod schemas, `assertSchema` on every response. Specs in `tests/api/`. Validation asserted as 400 (not 422). |
| 2026-08-17 | Phase 3 exit | `npx playwright test tests/api` — 28 passed. Phase 4 active, not started. |
| 2026-08-17 | Phase 4 CI | Root `.github/workflows/smoke.yml` (PR, `@smoke`, HTML artifact) and `regression.yml` (main, 3 shards, HTML artifacts). Branch protection steps in `docs/ci.md`. |
| 2026-08-17 | Clone DX | `loanflow/scripts/ensure-env.cjs` copies `.env.example` on seed; Playwright `dev-ready.cjs` waits for :3000 and :4000. |
| 2026-08-17 | Phase 4 verify | `npx playwright test --grep @smoke` — 4 passed (~9s). |
| 2026-08-17 | Phase 5 docs | Root README (run app/tests/CI + polling vs sleep); `docs/architecture.md`, `docs/test-strategy.md`, `docs/ci.md`. Phase 6 active, not started. |
| 2026-08-17 | D5 locked | LangGraph for failure triage. Stretch RAG deferred. |
| 2026-08-17 | Phase 6 agent | `loanflow-qa/agent/triage/`: parse JSON → classify → draft → optional GitHub file. Script `npm run triage`. |
| 2026-08-17 | Phase 6 CI | `smoke.yml` + `regression.yml`: `issues: write`, JSON/trace artifacts, triage `--file-issue` on `failure()`. |
| 2026-08-17 | Phase 6 exit | Fixtures classify correctly (regression / flaky / environment). Docs updated. Stretch RAG not built. |
| 2026-08-17 | Close-out | README metrics (42 tests; smoke ~9s; regression 1m48s). Branch protection on `main`. |
| 2026-08-17 | Stretch RAG | Optional LLM rationale + GitHub-issue RAG in enrich node. Labels still from rules. |
| 2026-08-17 | OpenAI brief | zod-checked gpt-4o-mini investigation (severity, area, next checks); embeddings RAG when key set. |
