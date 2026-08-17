import fs from "fs";
import path from "path";
import { listTriageIssues } from "./github";
import { embedTexts } from "./llm";
import type { PastIssue, SimilarIssue, TriageResult } from "./types";

const JACCARD_MIN = 0.35;
const COSINE_MIN = 0.82;

function queryText(result: TriageResult): string {
  const err = result.test.results
    .map((r) => r.errorMessage ?? "")
    .join(" ");
  return `${result.classification} ${result.test.title} ${result.test.file} ${err}`;
}

function issueText(issue: PastIssue): string {
  return `${issue.title}\n${issue.body}`;
}

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9_]+/i)
      .filter((t) => t.length > 2),
  );
}

function jaccard(a: string, b: string): number {
  const left = tokens(a);
  const right = tokens(b);
  if (left.size === 0 || right.size === 0) return 0;
  let inter = 0;
  for (const t of left) if (right.has(t)) inter += 1;
  return inter / (left.size + right.size - inter);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function loadIssuesFromFile(issuesPath: string): PastIssue[] {
  const abs = path.resolve(issuesPath);
  if (!fs.existsSync(abs)) {
    throw new Error(`Issues fixture not found: ${abs}`);
  }
  const raw = JSON.parse(fs.readFileSync(abs, "utf8")) as unknown;
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      number: typeof item.number === "number" ? item.number : 0,
      title: typeof item.title === "string" ? item.title : "",
      body: typeof item.body === "string" ? item.body : "",
      url: typeof item.url === "string" ? item.url : `https://example.invalid/issues/${item.number}`,
    };
  });
}

export async function loadIssueCorpus(issuesPath?: string): Promise<PastIssue[]> {
  if (issuesPath) return loadIssuesFromFile(issuesPath);
  return listTriageIssues();
}

function pickBest(
  scores: { issue: PastIssue; score: number }[],
  min: number,
  method: SimilarIssue["method"],
): SimilarIssue | undefined {
  const best = scores.reduce<(typeof scores)[0] | undefined>((acc, row) => {
    if (!acc || row.score > acc.score) return row;
    return acc;
  }, undefined);
  if (!best || best.score < min) return undefined;
  return {
    number: best.issue.number,
    title: best.issue.title,
    url: best.issue.url,
    score: Number(best.score.toFixed(3)),
    method,
  };
}

export async function findSimilar(
  result: TriageResult,
  corpus: PastIssue[],
): Promise<SimilarIssue | undefined> {
  if (corpus.length === 0) return undefined;
  const query = queryText(result);

  const embeddings = await embedTexts([query, ...corpus.map(issueText)]);
  if (embeddings && embeddings.length === corpus.length + 1) {
    const [qVec, ...issueVecs] = embeddings;
    const scored = corpus.map((issue, i) => ({
      issue,
      score: cosine(qVec, issueVecs[i]),
    }));
    return pickBest(scored, COSINE_MIN, "embeddings");
  }

  const scored = corpus.map((issue) => ({
    issue,
    score: jaccard(query, issueText(issue)),
  }));
  return pickBest(scored, JACCARD_MIN, "jaccard");
}
