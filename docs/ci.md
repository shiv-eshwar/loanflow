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

## Branch protection (enable on GitHub)

Actions cannot turn this on by themselves. In the GitHub repo:

1. Settings → Branches → Add rule for `main`
2. Require a pull request before merging
3. Require status checks to pass → select **Smoke** (`smoke.yml` / job `smoke`)
4. Do not allow bypassing for admins if you want the same gate for everyone

Until that is enabled, PRs still run smoke, but GitHub will not block merge.

## Local equivalent

```bash
cd loanflow-qa
npx playwright test --grep @smoke
npx playwright test
```
