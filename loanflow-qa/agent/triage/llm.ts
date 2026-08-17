import { z } from "zod";
import type { Classification, Investigation, TriageResult } from "./types";

const llmJsonSchema = z.object({
  rationale: z.string().min(1).max(800),
  severity: z.enum(["P0", "P1", "P2", "P3"]),
  suspectedArea: z.string().min(1).max(160),
  nextChecks: z.array(z.string().min(1).max(240)).min(2).max(4),
});

export function hasOpenAI(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function openaiKey(): string | undefined {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || undefined;
}

export function ruleInvestigation(result: TriageResult): Investigation {
  const file = result.test.file;
  const layer = file.includes("/api/")
    ? "Express API (`loanflow/api`)"
    : file.includes("/ui/")
      ? "UI / Page Object (`loanflow-qa/pages`)"
      : "Playwright harness";

  if (result.classification === "environment") {
    return {
      rationale: result.rationale,
      severity: "P1",
      suspectedArea: `${layer} — process/browser not ready`,
      nextChecks: [
        "Confirm Express is listening on :4000 and Next on :3000",
        "Confirm `npx playwright install chromium` on this machine/CI image",
        "Check webServer logs for ECONNREFUSED / 5xx before re-running the spec",
      ],
      source: "rules",
    };
  }

  if (result.classification === "flaky") {
    return {
      rationale: result.rationale,
      severity: "P2",
      suspectedArea: `${layer} — async underwriting wait`,
      nextChecks: [
        "Re-run the spec locally with `--repeat-each=3` to see if it recovers",
        "Confirm the wait uses `waitForCondition` (timeout + backoff), not `waitForTimeout`",
        "If it only fails in CI, compare traces: timing vs a hard assertion",
      ],
      source: "rules",
    };
  }

  return {
    rationale: result.rationale,
    severity: result.expected && result.actual ? "P0" : "P1",
    suspectedArea: `${layer} — assertion / schema / status-code mismatch`,
    nextChecks: [
      `Re-run: npx playwright test ${file} --repeat-each=1`,
      "Diff the suspected commit range against the last green main run",
      "If this is an API spec, confirm `assertSchema` still matches the live JSON",
    ],
    source: "rules",
  };
}

/** Structured brief. Classification is fixed by rules; the model cannot override it. */
export async function enrichWithOpenAI(
  result: TriageResult,
  errorBlob: string,
): Promise<Investigation> {
  const fallback = ruleInvestigation(result);
  const key = openaiKey();
  if (!key) return fallback;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a QA triage assistant for a mortgage loan-origination test suite. Return JSON only. The classification is already decided by deterministic rules and must not be changed or contradicted.",
          },
          {
            role: "user",
            content: JSON.stringify({
              classification: result.classification,
              ruleRationale: result.rationale,
              spec: result.test.title,
              file: result.test.file,
              expected: result.expected,
              actual: result.actual,
              error: errorBlob.slice(0, 1500),
              schema: {
                rationale: "one paragraph, agrees with the given classification",
                severity: "P0|P1|P2|P3",
                suspectedArea: "short area of the codebase to inspect first",
                nextChecks: "2-4 concrete commands or checks for a developer",
              },
            }),
          },
        ],
      }),
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return fallback;
    const parsed = llmJsonSchema.safeParse(JSON.parse(raw) as unknown);
    if (!parsed.success) return fallback;
    return { ...parsed.data, source: "openai" };
  } catch {
    return fallback;
  }
}

export async function embedTexts(texts: string[]): Promise<number[][] | undefined> {
  const key = openaiKey();
  if (!key || texts.length === 0) return undefined;

  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: texts.map((t) => t.slice(0, 8000)),
      }),
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as {
      data?: { embedding: number[]; index: number }[];
    };
    const rows = data.data;
    if (!rows || rows.length !== texts.length) return undefined;
    return [...rows].sort((a, b) => a.index - b.index).map((row) => row.embedding);
  } catch {
    return undefined;
  }
}
