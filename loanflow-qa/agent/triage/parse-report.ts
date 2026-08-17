import fs from "fs";
import path from "path";
import type { FailedTest, TestResult } from "./types";

type Json = Record<string, unknown>;

function asArray(value: unknown): Json[] {
  return Array.isArray(value) ? (value as Json[]) : [];
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function traceFromAttachments(attachments: unknown): string | undefined {
  for (const item of asArray(attachments)) {
    if (str(item.name) === "trace" && str(item.path)) {
      return str(item.path);
    }
  }
  return undefined;
}

function parseError(result: Json): { message?: string; stack?: string } {
  const error = result.error as Json | undefined;
  if (!error) return {};
  return {
    message: str(error.message) || undefined,
    stack: str(error.stack) || undefined,
  };
}

function collectFromSuite(suite: Json, fileFallback: string, out: FailedTest[]): void {
  const file = str(suite.file) || fileFallback;
  for (const nested of asArray(suite.suites)) {
    collectFromSuite(nested, file, out);
  }
  for (const spec of asArray(suite.specs)) {
    const title = [str(suite.title), str(spec.title)].filter(Boolean).join(" › ");
    for (const test of asArray(spec.tests)) {
      const results: TestResult[] = asArray(test.results).map((result) => {
        const err = parseError(result);
        return {
          status: str(result.status) || "unknown",
          retry: num(result.retry),
          duration: num(result.duration) || undefined,
          errorMessage: err.message,
          errorStack: err.stack,
          tracePath: traceFromAttachments(result.attachments),
        };
      });
      const hadFail = results.some(
        (r) => r.status === "failed" || r.status === "timedOut" || r.status === "interrupted",
      );
      const passedOnRetry = hadFail && results.some((r) => r.status === "passed");
      const stillFailed = results.length > 0 && results[results.length - 1].status !== "passed";
      if (!hadFail && !stillFailed) continue;
      if (!passedOnRetry && !stillFailed) continue;
      out.push({
        title: title || "unknown test",
        file: str(spec.file) || file,
        project: str(test.projectName) || "chromium",
        results,
        passedOnRetry,
      });
    }
  }
}

export function parsePlaywrightReport(reportPath: string): FailedTest[] {
  const abs = path.resolve(reportPath);
  if (!fs.existsSync(abs)) {
    throw new Error(`Playwright JSON report not found: ${abs}`);
  }
  const raw = JSON.parse(fs.readFileSync(abs, "utf8")) as Json;
  const failed: FailedTest[] = [];
  for (const suite of asArray(raw.suites)) {
    collectFromSuite(suite, "", failed);
  }
  return failed;
}

function walkTraces(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTraces(full, out);
    else if (entry.name === "trace.zip") out.push(full);
  }
}

export function findTrace(test: FailedTest, tracesDir?: string): string | undefined {
  const fromResult = [...test.results].reverse().find((r) => r.tracePath)?.tracePath;
  if (fromResult) return fromResult;
  if (!tracesDir || !fs.existsSync(tracesDir)) return undefined;

  const traces: string[] = [];
  walkTraces(tracesDir, traces);
  if (traces.length === 0) return undefined;

  const fileHint = test.file.replace(/\\/g, "/").replace(/\.(spec|test)\.ts$/, "");
  const slug = fileHint.replace(/\//g, "-");
  return (
    traces.find((p) => p.includes(slug) || p.includes(path.basename(fileHint))) ?? traces[0]
  );
}
