# Test strategy

## Goal

Prove the loan lifecycle works end-to-end and that the API enforces auth, validation, and the state machine — with a suite that stays stable despite a randomized underwriting delay.

## Layers

| Layer | Where | What we trust it for |
|---|---|---|
| UI | `loanflow-qa/tests/ui/` | User-visible flow, form constraints, redirects, status badge |
| API | `loanflow-qa/tests/api/` | Status codes, authorization, illegal transitions, schemas |
| Unit-in-suite | `schemas/` + `wait-helpers.ts` | Contract of responses; wait policy |

UI tests do not replace API tests. Illegal transitions are asserted **on the server** (409). The UI test only checks that no “skip to approved” control is offered.

## Critical path (`@smoke`)

Run on every PR (~2 min budget):

- Login → dashboard
- Create application → upload PDF → poll to **approved**
- API login 200 + schema
- API create application 201 + schema

Full suite on merge to `main`, sharded ×3.

## Data

- Seed users: `qa@loanflow.test`, `other@loanflow.test`
- Payloads from `fixtures/application-factory.ts` only (`valid()` approves, `highLeverage()` rejects)
- No hardcoded bodies in spec files

## Auth and authorization

- No token → 401 (API) or redirect to `/login` (UI)
- Expired JWT → 401 / error, not a silent success
- User A cannot GET/PUT/upload/status User B’s application → 403
- List is owner-scoped

## State machine

Legal: `draft → submitted → under_review → approved | rejected`

Always cover skip, backwards, and terminal → 409.

## Async / flakiness

Underwriting delay is 1–5s + 1s by design. Status UI tests use `waitForCondition` (timeout + backoff). Never `page.waitForTimeout` for that wait.

See the root README for why polling is used here and what a production suite would use instead (webhooks / event-driven test hooks).

## Schema

Every API JSON body (2xx and 4xx) is `safeParse`’d with zod. Status code alone is not a pass.

## Failure triage

CI failures are classified from the Playwright **JSON reporter** (plus traces), not console logs:

| Label | When |
|---|---|
| `flaky` | Failed then passed on retry, or timeout/wait without a hard assertion |
| `environment` | Connection refused, browser launch, 5xx, webServer |
| `real_regression` | Assertion / schema / status-code mismatch that did not recover |

`--file-issue` opens a GitHub Issue labeled `triage:<class>`. Token from env only.

## Out of scope (for now)

- Allure
- Multi-browser matrix (Chromium only — keeps smoke fast)
- RAG over past issues (stretch)
