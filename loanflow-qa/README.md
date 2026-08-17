# loanflow-qa

Playwright + TypeScript UI suite for LoanFlow.

```bash
cd loanflow-qa
npm install
npx playwright install chromium
npx playwright test tests/ui
```

The config starts `loanflow` (`npm run dev`) unless it is already running on :3000.
