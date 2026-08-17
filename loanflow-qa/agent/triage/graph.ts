import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { parsePlaywrightReport } from "./parse-report";
import { draftResult } from "./draft";
import { fileIssue } from "./github";
import type { FailedTest, TriageResult } from "./types";

const TriageState = Annotation.Root({
  reportPath: Annotation<string>(),
  tracesDir: Annotation<string | undefined>(),
  fileIssue: Annotation<boolean>(),
  tests: Annotation<FailedTest[]>({
    reducer: (_left: FailedTest[], right: FailedTest[]) => right,
    default: () => [],
  }),
  results: Annotation<TriageResult[]>({
    reducer: (_left: TriageResult[], right: TriageResult[]) => right,
    default: () => [],
  }),
  filedUrls: Annotation<string[]>({
    reducer: (_left: string[], right: string[]) => right,
    default: () => [],
  }),
});

async function parseNode(state: typeof TriageState.State) {
  const tests = parsePlaywrightReport(state.reportPath);
  return { tests };
}

async function classifyAndDraftNode(state: typeof TriageState.State) {
  const results = state.tests.map((test) => draftResult(test, state.tracesDir));
  return { results };
}

async function fileNode(state: typeof TriageState.State) {
  if (!state.fileIssue) {
    return { filedUrls: [] as string[] };
  }
  const filedUrls: string[] = [];
  for (const result of state.results) {
    filedUrls.push(await fileIssue(result));
  }
  return { filedUrls };
}

export function buildTriageGraph() {
  return new StateGraph(TriageState)
    .addNode("parse", parseNode)
    .addNode("classify", classifyAndDraftNode)
    .addNode("file", fileNode)
    .addEdge(START, "parse")
    .addEdge("parse", "classify")
    .addEdge("classify", "file")
    .addEdge("file", END)
    .compile();
}

export type { TriageState };
