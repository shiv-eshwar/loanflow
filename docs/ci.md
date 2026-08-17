# CI and branch protection

Workflows live at the **repo root** (`.github/workflows/`). GitHub Actions only reads that path; this workspace is a monorepo (`loanflow/` + `loanflow-qa/`).

## Workflows

### `smoke.yml`

- **When:** pull request (and `workflow_dispatch`)
- **What:** `npx playwright test --grep @smoke`
- **Budget:** keep this the fast gate (~2 minutes of test time once browsers are installed)
- **Artifact:** `playwright-report-smoke`

### `regression.yml`

- **When:** push to `main` (and `workflow_dispatch`)
- **What:** full Playwright suite, **3 shards** (`--shard=n/3`)
- **Artifact:** `playwright-report-regression-1` … `-3`

Each job: install app → `prisma generate` + seed → install QA → Chromium → tests. `CI=true` so Playwright does not reuse a local server and retries once.

On **failure**, a LangGraph triage agent reads `test-results/results.json` (Playwright JSON reporter, not logs), classifies each failure as `flaky` | `real_regression` | `environment`, and files a GitHub Issue labeled `triage:<class>`. Needs `permissions.issues: write` (already set). Default `GITHUB_TOKEN` is enough.

Labels: `triage:flaky`, `triage:real_regression`, `triage:environment`. Locally the CLI is a **dry-run** (prints the issue body). CI passes `--file-issue` only on `failure()`.

Optional `OPENAI_API_KEY` (GitHub secret or local `.env`): gpt-4o-mini writes a zod-checked investigation brief (severity, area, next checks) and embeddings power “resembles #N”. Unset → rules fill the same fields + Jaccard. Labels never come from the model. Never commit the key.

```bash
cd loanflow-qa
npx tsx agent/triage/cli.ts --report agent/triage/fixtures/sample-failed-report.json --issues agent/triage/fixtures/sample-past-issues.json
# add --file-issue to POST (requires GITHUB_TOKEN and GITHUB_REPOSITORY=owner/repo)
```

## Branch protection

Enabled on `main`:

- Pull requests required to merge (0 approving reviews — solo repo)
- Status check **smoke** must pass (`smoke.yml` / job `smoke`)
- Force pushes and branch deletion off
- Admin bypass left on so the owner can still push `main` (regression stays push-triggered)

PRs cannot merge until Smoke is green.

## Local equivalent

```bash
cd loanflow-qa
npx playwright test --grep @smoke
npx playwright test
npx tsx agent/triage/cli.ts --report agent/triage/fixtures/sample-failed-report.json --issues agent/triage/fixtures/sample-past-issues.json
```
