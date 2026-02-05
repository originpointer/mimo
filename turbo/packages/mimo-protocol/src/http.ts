export type HttpErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "INTERNAL"
  | "UNAVAILABLE";

export type HttpErrorDetails = {
  retryable?: boolean;
  context?: Record<string, unknown>;
  fieldErrors?: Array<{ field: string; message: string }>;
};

export type HttpError = {
  code: HttpErrorCode;
  message: string;
  details?: HttpErrorDetails;
};

export type HttpEnvelopeOk<T> = {
  ok: true;
  data: T;
};

export type HttpEnvelopeError = {
  ok: false;
  error: HttpError;
};

export type HttpEnvelope<T> = HttpEnvelopeOk<T> | HttpEnvelopeError;
