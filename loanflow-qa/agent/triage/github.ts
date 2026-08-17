import type { PastIssue, TriageResult } from "./types";

function token(): string | undefined {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
}

function repo(): { owner: string; name: string } | undefined {
  const raw = process.env.GITHUB_REPOSITORY;
  if (!raw || !raw.includes("/")) return undefined;
  const [owner, name] = raw.split("/");
  return { owner, name };
}

function headers(auth: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${auth}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

type GhIssue = {
  number: number;
  title: string;
  body?: string | null;
  html_url: string;
  pull_request?: unknown;
  labels?: { name?: string }[];
};

export async function listTriageIssues(): Promise<PastIssue[]> {
  const auth = token();
  const target = repo();
  if (!auth || !target) return [];

  const res = await fetch(
    `https://api.github.com/repos/${target.owner}/${target.name}/issues?state=all&per_page=50`,
    { headers: headers(auth) },
  );
  if (!res.ok) return [];

  const rows = (await res.json()) as GhIssue[];
  if (!Array.isArray(rows)) return [];

  return rows
    .filter((issue) => !issue.pull_request)
    .filter((issue) =>
      (issue.labels ?? []).some((label) => str(label.name).startsWith("triage:")),
    )
    .map((issue) => ({
      number: issue.number,
      title: issue.title,
      body: issue.body ?? "",
      url: issue.html_url,
    }));
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function fileIssue(result: TriageResult): Promise<string> {
  const auth = token();
  const target = repo();
  if (!auth) {
    throw new Error("GITHUB_TOKEN or GH_TOKEN is not set");
  }
  if (!target) {
    throw new Error("GITHUB_REPOSITORY is not set (owner/repo)");
  }

  const res = await fetch(
    `https://api.github.com/repos/${target.owner}/${target.name}/issues`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${auth}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: result.issueTitle.slice(0, 250),
        body: result.issueBody,
        labels: [`triage:${result.classification}`],
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub issue create failed: ${res.status} ${text}`);
  }

  const body = (await res.json()) as { html_url?: string };
  return body.html_url ?? "(no url)";
}
