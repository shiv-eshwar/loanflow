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

export type SimilarIssue = {
  number: number;
  title: string;
  url: string;
  score: number;
  method: "embeddings" | "jaccard";
};

export type PastIssue = {
  number: number;
  title: string;
  body: string;
  url: string;
};

export type Severity = "P0" | "P1" | "P2" | "P3";

export type Investigation = {
  rationale: string;
  severity: Severity;
  suspectedArea: string;
  nextChecks: string[];
  source: "openai" | "rules";
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
  similarIssue?: SimilarIssue;
  investigation?: Investigation;
  issueTitle: string;
  issueBody: string;
};

export type TriageState = {
  reportPath: string;
  tracesDir?: string;
  issuesPath?: string;
  fileIssue: boolean;
  tests: FailedTest[];
  results: TriageResult[];
  filedUrls: string[];
};
