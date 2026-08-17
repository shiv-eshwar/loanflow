import type { Classification, FailedTest } from "./types";

const ENV_RE =
  /ECONNREFUSED|ECONNRESET|ENOTFOUND|net::ERR|browserType\.launch|Executable doesn't exist|webServer|status 502|status 503|503 Service|502 Bad Gateway|Target page, context or browser has been closed/i;

const TIMING_RE = /timed? out|timeout|waiting for|waitFor|Timeout/i;

const ASSERT_RE =
  /expect\(|assertion|schema mismatch|toBe\(|toEqual\(|toContain\(|Expected|received|status\(\)|HTTP 40[0-9]/i;

export function classifyTest(test: FailedTest): {
  classification: Classification;
  rationale: string;
} {
  const last = test.results[test.results.length - 1];
  const blob = test.results
    .map((r) => `${r.status} ${r.errorMessage ?? ""} ${r.errorStack ?? ""}`)
    .join("\n");

  if (ENV_RE.test(blob)) {
    return {
      classification: "environment",
      rationale: "Error matches infra/browser/connection failure, not an assertion.",
    };
  }

  if (test.passedOnRetry) {
    return {
      classification: "flaky",
      rationale: "Test failed then passed on retry (timing/order instability).",
    };
  }

  if (TIMING_RE.test(blob) && !ASSERT_RE.test(blob)) {
    return {
      classification: "flaky",
      rationale: "Failure looks timing-related (timeout / wait) without a hard assertion mismatch.",
    };
  }

  if (last && (last.status === "failed" || last.status === "timedOut")) {
    return {
      classification: "real_regression",
      rationale: ASSERT_RE.test(blob)
        ? "Assertion or status-code mismatch; did not recover on retry."
        : "Unrecovered failure that is not clearly infra or timeout.",
    };
  }

  return {
    classification: "real_regression",
    rationale: "Unclassified unrecovered failure; treated as a real regression.",
  };
}

export function suspectedRange(): string | undefined {
  const sha = process.env.GITHUB_SHA;
  const before = process.env.GITHUB_BEFORE;
  if (sha && before && before !== "0000000000000000000000000000000000000000") {
    return `${before.slice(0, 7)}...${sha.slice(0, 7)}`;
  }
  if (sha) return sha.slice(0, 7);
  return undefined;
}
