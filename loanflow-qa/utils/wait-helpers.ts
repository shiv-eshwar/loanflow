/**
 * Underwriting is delayed 1–5s then +1s to a decision. Poll with timeout+backoff
 * instead of page.waitForTimeout — a fixed sleep either flakes or wastes time.
 */
export async function waitForCondition(
  check: () => Promise<boolean>,
  options?: { timeoutMs?: number; intervalMs?: number; factor?: number },
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 15_000;
  const factor = options?.factor ?? 1.5;
  const maxInterval = 2_000;
  let interval = options?.intervalMs ?? 250;
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      if (await check()) return;
    } catch (error: unknown) {
      lastError = error;
    }
    await sleep(interval);
    interval = Math.min(maxInterval, Math.round(interval * factor));
  }

  const extra = lastError instanceof Error ? `: ${lastError.message}` : "";
  throw new Error(`Condition not met within ${timeoutMs}ms${extra}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
