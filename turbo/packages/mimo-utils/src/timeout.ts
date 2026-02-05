import { createAbortError, createTimeoutError } from "./errors";

export type SleepOptions = {
  signal?: AbortSignal;
};

export function sleep(ms: number, options: SleepOptions = {}): Promise<void> {
  const { signal } = options;

  if (signal?.aborted) {
    return Promise.reject(createAbortError());
  }

  return new Promise((resolve, reject) => {
    let timerId: ReturnType<typeof setTimeout> | undefined;

    const onAbort = () => {
      if (timerId !== undefined) {
        clearTimeout(timerId);
      }
      signal?.removeEventListener("abort", onAbort);
      reject(createAbortError());
    };

    timerId = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export type WithTimeoutOptions = {
  timeoutMs: number;
  signal?: AbortSignal;
  timeoutMessage?: string;
  timeoutCode?: string;
  timeoutRetryable?: boolean;
  details?: Record<string, unknown>;
};

export async function withTimeout<T>(
  promise: Promise<T>,
  options: WithTimeoutOptions,
): Promise<T> {
  const {
    timeoutMs,
    signal,
    timeoutMessage,
    timeoutCode,
    timeoutRetryable,
    details,
  } = options;

  if (signal?.aborted) {
    throw createAbortError();
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let abortListener: (() => void) | undefined;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          createTimeoutError({
            message: timeoutMessage ?? `Timed out after ${timeoutMs}ms`,
            code: timeoutCode,
            retryable: timeoutRetryable,
            details: { timeoutMs, ...details },
          }),
        );
      }, timeoutMs);
    });

    if (!signal) {
      return await Promise.race([promise, timeoutPromise]);
    }

    const abortPromise = new Promise<never>((_, reject) => {
      abortListener = () => reject(createAbortError());
      signal.addEventListener("abort", abortListener, { once: true });
    });

    return await Promise.race([promise, timeoutPromise, abortPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    if (signal && abortListener) {
      signal.removeEventListener("abort", abortListener);
    }
  }
}
