import fs from "fs";
import path from "path";
import { buildTriageGraph } from "./graph";
import { hasOpenAI } from "./llm";

function arg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

function has(flag: string): boolean {
  return process.argv.includes(flag);
}

function applyEnvLine(line: string, keys?: Set<string>): void {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const eq = trimmed.indexOf("=");
  if (eq < 1) return;
  const key = trimmed.slice(0, eq).trim();
  if (keys && !keys.has(key)) return;
  const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  if (process.env[key] === undefined && value) process.env[key] = value;
}

function loadDotEnv(): void {
  const files = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../loanflow/api/.env"),
  ];
  for (const envPath of files) {
    if (!fs.existsSync(envPath)) continue;
    const onlyOpenAi = envPath.endsWith(`${path.sep}api${path.sep}.env`);
    const raw = fs.readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      applyEnvLine(line, onlyOpenAi ? new Set(["OPENAI_API_KEY"]) : undefined);
    }
  }
}

async function main(): Promise<void> {
  loadDotEnv();
  const report = arg("--report");
  if (!report) {
    console.error(
      "Usage: npx tsx agent/triage/cli.ts --report <results.json> [--traces test-results] [--issues issues.json] [--file-issue]",
    );
    process.exit(1);
  }

  const graph = buildTriageGraph();
  const out = await graph.invoke({
    reportPath: path.resolve(report),
    tracesDir: arg("--traces") ? path.resolve(arg("--traces") as string) : undefined,
    issuesPath: arg("--issues") ? path.resolve(arg("--issues") as string) : undefined,
    fileIssue: has("--file-issue"),
    tests: [],
    results: [],
    filedUrls: [],
  });

  if (out.results.length === 0) {
    console.log("No failed or flaky tests in report.");
    return;
  }

  for (const result of out.results) {
    console.log("\n" + "=".repeat(60));
    console.log(result.issueTitle);
    console.log("=".repeat(60));
    console.log(result.issueBody);
  }

  if (out.filedUrls.length > 0) {
    console.log("\nFiled issues:");
    for (const url of out.filedUrls) console.log(`- ${url}`);
  } else if (!has("--file-issue")) {
    console.log("\nDry run (pass --file-issue to POST GitHub issues).");
  }

  const llmUsed = out.results.some((r) => r.investigation?.source === "openai");
  const ragMethod = out.results.find((r) => r.similarIssue)?.similarIssue?.method;
  console.log(
    `\nEnrichment: ${llmUsed ? "OpenAI gpt-4o-mini (zod-checked JSON)" : hasOpenAI() ? "OpenAI key set but fell back to rules" : "rules only (set OPENAI_API_KEY for LLM)"}` +
      (ragMethod ? `; RAG=${ragMethod}` : "; RAG=no match"),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
