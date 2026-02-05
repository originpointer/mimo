export type AppErrorDetails = Record<string, unknown>;

export type AppErrorOptions = {
  code: string;
  message: string;
  retryable?: boolean;
  details?: AppErrorDetails;
  cause?: unknown;
};

export class AppError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly details?: AppErrorDetails;
  public override readonly cause?: unknown;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.details = options.details;
    this.cause = options.cause;
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

export function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }

  const message = typeof value === "string" ? value : "Unknown error";
  return new Error(message);
}

export type CreateTimeoutErrorOptions = {
  message?: string;
  code?: string;
  retryable?: boolean;
  details?: AppErrorDetails;
  cause?: unknown;
};

export function createTimeoutError(
  options: CreateTimeoutErrorOptions = {},
): AppError {
  const {
    message = "Timed out",
    code = "TIMEOUT",
    retryable = true,
    details,
    cause,
  } = options;

  return new AppError({ code, message, retryable, details, cause });
}

export type CreateAbortErrorOptions = {
  message?: string;
  code?: string;
  retryable?: boolean;
  details?: AppErrorDetails;
  cause?: unknown;
};

export function createAbortError(options: CreateAbortErrorOptions = {}): AppError {
  const {
    message = "Aborted",
    code = "ABORTED",
    retryable = false,
    details,
    cause,
  } = options;

  return new AppError({ code, message, retryable, details, cause });
}
