# loanflow-qa

Playwright + TypeScript suite for LoanFlow. UI tests use the Page Object Model. API tests hit Express on `:4000` and validate every JSON body with zod.

```bash
cd loanflow-qa
npm install
npx playwright install chromium
npx playwright test tests/ui
npx playwright test tests/api
npx playwright test --grep @smoke
npm run triage -- --report agent/triage/fixtures/sample-failed-report.json
```

If LoanFlow is not running, Playwright starts `loanflow` and waits for `:3000` and `:4000`.

See the [root README](../README.md) for polling vs sleep, and [docs/test-strategy.md](../docs/test-strategy.md) for coverage.
