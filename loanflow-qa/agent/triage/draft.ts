import type { Classification, FailedTest, TriageResult } from "./types";
import { classifyTest, suspectedRange } from "./classify";
import { findTrace } from "./parse-report";

function stackExcerpt(test: FailedTest): string | undefined {
  const withStack = [...test.results].reverse().find((r) => r.errorStack);
  if (!withStack?.errorStack) return undefined;
  return withStack.errorStack.split("\n").slice(0, 12).join("\n");
}

function expectedActual(test: FailedTest): { expected?: string; actual?: string } {
  const msg = [...test.results].reverse().find((r) => r.errorMessage)?.errorMessage;
  if (!msg) return {};
  const expected = msg.match(/Expected:?\s*([^\n]+)/i)?.[1]?.trim();
  const received = msg.match(/Received:?\s*([^\n]+)/i)?.[1]?.trim();
  return { expected, actual: received };
}

export function draftResult(
  test: FailedTest,
  tracesDir?: string,
): TriageResult {
  const { classification, rationale } = classifyTest(test);
  const last = test.results[test.results.length - 1];
  const { expected, actual } = expectedActual(test);
  const range = suspectedRange();
  const tracePath = findTrace(test, tracesDir);
  const stack = stackExcerpt(test);

  const issueTitle = `[${classification}] ${test.title}`;
  const issueBody = buildBody({
    classification,
    rationale,
    test,
    lastError: last?.errorMessage,
    expected,
    actual,
    stack,
    tracePath,
    range,
  });

  return {
    test,
    classification,
    rationale,
    expected,
    actual,
    stackExcerpt: stack,
    tracePath,
    suspectedRange: range,
    issueTitle,
    issueBody,
  };
}

function buildBody(input: {
  classification: Classification;
  rationale: string;
  test: FailedTest;
  lastError?: string;
  expected?: string;
  actual?: string;
  stack?: string;
  tracePath?: string;
  range?: string;
}): string {
  const lines = [
    `## Classification`,
    `\`${input.classification}\` — ${input.rationale}`,
    ``,
    `## Test`,
    `- **Title:** ${input.test.title}`,
    `- **File:** \`${input.test.file}\``,
    `- **Project:** ${input.test.project}`,
    `- **Retries:** ${input.test.results.map((r) => r.status).join(" → ")}`,
  ];

  if (input.range) {
    lines.push(`- **Suspected commit range:** \`${input.range}\``);
  }
  if (input.tracePath) {
    lines.push(`- **Trace:** \`${input.tracePath}\``);
  }

  lines.push(``, `## Expected vs actual`);
  if (input.classification === "real_regression") {
    lines.push(`- **Expected:** ${input.expected ?? "(see error)"}`);
    lines.push(`- **Actual:** ${input.actual ?? "(see error)"}`);
  } else {
    lines.push(`Not a hard product assertion — see classification.`);
  }

  if (input.lastError) {
    lines.push(``, `## Error`, "```", input.lastError.slice(0, 2000), "```");
  }
  if (input.stack && input.classification === "real_regression") {
    lines.push(``, `## Stack excerpt`, "```", input.stack, "```");
  }

  lines.push(
    ``,
    `## Repro`,
    "```bash",
    `cd loanflow-qa`,
    `npx playwright test ${input.test.file} --repeat-each=1`,
    "```",
    ``,
    `_Filed by LoanFlow QA triage agent (Playwright JSON reporter, not console logs)._`,
  );

  return lines.join("\n");
}
