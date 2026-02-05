import { createAbortError } from "./errors";
import { sleep } from "./timeout";

export type RetryContext = {
  attempt: number;
  error: unknown;
  delayMs: number;
};

export type RetryOptions = {
  attempts: number;
  signal?: AbortSignal;
  minDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  jitterRatio?: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (context: RetryContext) => void;
};

export async function retry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const {
    attempts,
    signal,
    minDelayMs = 250,
    maxDelayMs = 30_000,
    factor = 2,
    jitterRatio = 0.2,
    shouldRetry,
    onRetry,
  } = options;

  if (!Number.isFinite(attempts) || attempts < 1) {
    throw new Error("retry(): options.attempts must be >= 1");
  }

  if (signal?.aborted) {
    throw createAbortError();
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;

      if (attempt >= attempts) {
        break;
      }

      if (shouldRetry && !shouldRetry(error)) {
        break;
      }

      if (signal?.aborted) {
        throw createAbortError({ cause: error });
      }

      const baseDelay = Math.min(
        maxDelayMs,
        Math.round(minDelayMs * factor ** (attempt - 1)),
      );

      const jitter = (Math.random() * 2 - 1) * jitterRatio;
      const delayMs = Math.max(0, Math.round(baseDelay * (1 + jitter)));

      onRetry?.({ attempt, error, delayMs });

      await sleep(delayMs, { signal });
    }
  }

  throw lastError;
}
