export const CLASSIFICATIONS = [
  "flaky",
  "real_regression",
  "environment",
] as const;

export type Classification = (typeof CLASSIFICATIONS)[number];

export type TestResult = {
  status: string;
  retry: number;
  duration?: number;
  errorMessage?: string;
  errorStack?: string;
  tracePath?: string;
};

export type FailedTest = {
  title: string;
  file: string;
  project: string;
  results: TestResult[];
  passedOnRetry: boolean;
};

export type TriageResult = {
  test: FailedTest;
  classification: Classification;
  rationale: string;
  expected?: string;
  actual?: string;
  stackExcerpt?: string;
  tracePath?: string;
  suspectedRange?: string;
  issueTitle: string;
  issueBody: string;
};

export type TriageState = {
  reportPath: string;
  tracesDir?: string;
  fileIssue: boolean;
  tests: FailedTest[];
  results: TriageResult[];
  filedUrls: string[];
};
