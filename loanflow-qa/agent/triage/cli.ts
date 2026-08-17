import path from "path";
import { buildTriageGraph } from "./graph";

function arg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

function has(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main(): Promise<void> {
  const report = arg("--report");
  if (!report) {
    console.error(
      "Usage: npx tsx agent/triage/cli.ts --report <results.json> [--traces test-results] [--file-issue]",
    );
    process.exit(1);
  }

  const graph = buildTriageGraph();
  const out = await graph.invoke({
    reportPath: path.resolve(report),
    tracesDir: arg("--traces") ? path.resolve(arg("--traces") as string) : undefined,
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
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
