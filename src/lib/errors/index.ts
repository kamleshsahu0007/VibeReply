export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "RATE_LIMIT_EXCEEDED"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_ERROR"
  | "INVALID_MODEL_OUTPUT"
  | "INTERNAL_ERROR"
  | "BAD_REQUEST";

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(code: AppErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super("VALIDATION_ERROR", message, 400, details);
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super("RATE_LIMIT_EXCEEDED", "Too many requests. Please slow down.", 429);
    this.retryAfterMs = retryAfterMs;
  }
}

export class UpstreamError extends AppError {
  constructor(message: string, details?: unknown) {
    super("UPSTREAM_ERROR", message, 502, details);
  }
}

export class UpstreamTimeoutError extends AppError {
  constructor(message = "Upstream request timed out") {
    super("UPSTREAM_TIMEOUT", message, 504);
  }
}

export class InvalidModelOutputError extends AppError {
  constructor(message: string, details?: unknown) {
    super("INVALID_MODEL_OUTPUT", message, 502, details);
  }
}
