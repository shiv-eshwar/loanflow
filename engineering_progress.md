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
| Active phase | **1 — Target app** |
| Overall status | `active` |
| Last updated | 2026-08-17 |
| Last completed item | GitHub repo `loanflow-qa` created |
| Blockers | none |

Implementing Phase 1 (target app). No Playwright yet. GitHub: https://github.com/shiv-eshwar/loanflow-qa

---

## Open decisions (resolve before the work that depends on them)

Do not silently pick these. Confirm with the user, then move the decision into **Locked decisions**.

| ID | Decision | Needed by | Options / recommendation |
|---|---|---|---|
| D4 | Schema library | Phase 3 | zod (fits TypeScript stack). Spec allows zod or ajv. |
| D5 | Triage agent framework | Phase 6 | LangGraph. Spec allows LangGraph or CrewAI. |

---

## Locked decisions

| ID | Decision |
|---|---|
| D1 | `loanflow/` + `loanflow-qa/` in this workspace; split to two GitHub repos later if needed. |
| D2 | `/login` page included (required for UI auth). |
| D3 | Express API on `:4000`, not Next.js API routes. Next.js rewrites `/api/*` to Express. |

---

## Phase 1 — Target app (LoanFlow)

Status: `active`

Skeleton: frontend + backend + DB, runs locally, manually verified. Keep the app small. No Playwright in this phase.

### 1.1 Scaffold and data

- [ ] Repo layout created (`loanflow/` app; `loanflow-qa/` folder reserved or empty until Phase 2)
- [ ] TypeScript strict mode in the app
- [ ] Prisma + SQLite
- [ ] Tables: `users`, `applications`, `documents`
- [ ] Seed: one test user + fixture applications in multiple statuses

### 1.2 Auth and API (6–8 endpoints, currently 7)

- [ ] `POST /api/auth/login` → JWT
- [ ] `POST /api/applications` — create (`draft`)
- [ ] `GET /api/applications/:id` — owner-only
- [ ] `GET /api/applications` — auth required, paginated
- [ ] `POST /api/applications/:id/documents` — multipart; PDF/JPG; size/type validation
- [ ] `PUT /api/applications/:id/status` — state-machine validated
- [ ] `GET /api/applications/:id/status` — poll; randomized 1–5s underwriting delay

### 1.3 State machine

Legal: `draft → submitted → under_review → approved | rejected`

- [ ] Legal transitions accepted
- [ ] Illegal transitions rejected (skip, backwards, terminal) with 400/409
- [ ] Auth: 401 unauthenticated; 403 wrong-user (authorization, not just authentication)

### 1.4 Frontend (3–4 pages + implied login)

- [ ] `/apply` — borrower info, loan amount, property type, income; client + server validation
- [ ] `/apply/[id]/documents` — mock upload, PDF/JPG, size/type validation
- [ ] `/applications/[id]` — status page; polls every N seconds
- [ ] `/dashboard` — auth-gated list; filter by status
- [ ] `/login` — only if D2 is locked yes

### 1.5 Manual verification (phase exit)

- [ ] App starts locally (frontend + API + DB)
- [ ] Happy path clicked: login → apply → upload → status reaches approved/rejected
- [ ] Illegal status transition rejected when exercised against the API
- [ ] Unauthenticated dashboard redirects; wrong-user cannot read another user's application

**Phase 1 exit:** all boxes above checked. Do not start Phase 2 until then.

---

## Phase 2 — Playwright UI suite

Status: `not_started` — blocked on Phase 1

POM from day 1. No `page.locator()` in `*.spec.ts`. No `page.waitForTimeout()` for status polling.

### 2.1 Framework skeleton

- [ ] `loanflow-qa/` scaffold; `playwright.config.ts`; TypeScript strict
- [ ] Page objects: `ApplyPage`, `DocumentsPage`, `StatusPage`, `DashboardPage` (and login page if D2 is yes)
- [ ] `fixtures/test-users.ts`
- [ ] `fixtures/application-factory.ts` — all test data comes from here
- [ ] `utils/wait-helpers.ts` — explicit polling with timeout + backoff

### 2.2 UI specs (`tests/ui/` only)

- [ ] `apply-flow.spec.ts` — happy path apply → upload → poll to approved; `@smoke` on critical path
- [ ] `document-upload.spec.ts` — type/size validation
- [ ] `status-tracking.spec.ts` — UI reflects state machine; no illegal transitions surfaced
- [ ] `auth.spec.ts` — protected redirect, invalid login, expired token
- [ ] Form validation: required fields, invalid loan amount, invalid property type

**Phase 2 exit:** UI suite runs locally against the app. POM + wait-helpers in place. No locators in spec files.

---

## Phase 3 — Playwright API suite + schema validation

Status: `not_started` — blocked on Phase 2

### 3.1 API harness

- [ ] `utils/api-client.ts`
- [ ] `schemas/application.schema.ts` (and auth/list/document schemas as needed)
- [ ] Every response assertion validates schema — status code alone is not enough

### 3.2 API specs (`tests/api/` only)

- [ ] `auth.spec.ts` — token required, expired token, wrong-user 403
- [ ] `applications.spec.ts` — status codes 2xx/4xx/401/403/404/422; illegal transitions 409/400
- [ ] `schema-validation.spec.ts` — types and enums, not just "field exists"
- [ ] Boundary: oversized upload, wrong file type, missing multipart fields
- [ ] Every endpoint has: happy path + validation/negative + unauthenticated + wrong-user

**Phase 3 exit:** API suite green locally; schemas used on every response assertion.

---

## Phase 4 — GitHub Actions CI

Status: `not_started` — blocked on Phase 3

- [ ] `smoke.yml` — on PR; `@smoke` only; ~2 min budget; HTML report artifact
- [ ] `regression.yml` — on merge to `main`; full suite; 2–3 shards; HTML report artifact
- [ ] Branch protection / PR check documented (enable on GitHub when repo exists)

**Phase 4 exit:** both workflows exist and publish the Playwright HTML report.

---

## Phase 5 — Docs

Status: `not_started` — blocked on Phase 4

- [ ] README (how to run app, how to run tests, CI)
- [ ] Architecture diagram
- [ ] Test strategy doc
- [ ] README section: why polling instead of sleep; what a production suite would use (webhook/event-driven hooks)

**Phase 5 exit:** those four artifacts exist and match what was built.

---

## Phase 6 — AI failure-triage agent

Status: `not_started` — blocked on Phase 5. Do not start early.

- [ ] Reads Playwright JSON reporter + trace files (not console logs)
- [ ] Classifies only: `flaky` | `real_regression` | `environment`
- [ ] Real regressions: failing assertion, stack trace, diff vs last-known-good, drafted bug report
- [ ] Files GitHub Issue via REST API; token from env, never hardcoded
- [ ] Stretch: RAG over past issues (“resembles issue #N”)

**Phase 6 exit:** agent runs on a failed report and can file a classified issue.

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
