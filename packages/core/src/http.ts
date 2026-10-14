import { ZodError } from "zod";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  NotImplementedError,
  UnauthorizedError,
} from "./errors";

/** JSON envelope shared by all API routes (SSE routes are the exception). */
export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = {
  ok: false;
  error: { code: string; message: string; fieldErrors?: Record<string, string[]> };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type MappedError = { status: number; body: ApiFailure };

/** Maps a thrown error to an HTTP status and envelope. Unknown errors become a generic 500. */
export function mapError(error: unknown): MappedError {
  const fail = (
    status: number,
    code: string,
    message: string,
    fieldErrors?: Record<string, string[]>,
  ): MappedError => ({
    status,
    body: { ok: false, error: { code, message, ...(fieldErrors && { fieldErrors }) } },
  });

  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues)
      (fieldErrors[issue.path.join(".") || "_"] ??= []).push(issue.message);
    return fail(400, "validation_error", "Invalid input", fieldErrors);
  }
  if (error instanceof UnauthorizedError) return fail(401, "unauthorized", "Unauthorized");
  if (error instanceof ForbiddenError) return fail(403, "forbidden", "Forbidden");
  if (error instanceof NotFoundError) return fail(404, "not_found", error.message);
  if (error instanceof ConflictError) return fail(409, "conflict", error.message);
  if (error instanceof NotImplementedError) return fail(501, "not_implemented", error.message);
  return fail(500, "internal_error", "Something went wrong");
}

export const CSRF_HEADER = "x-requested-with";
export const CSRF_HEADER_VALUE = "taskly";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** State-changing requests must carry the custom header that the client helper always sets. */
export function hasCsrfHeader(req: Request): boolean {
  return SAFE_METHODS.has(req.method) || req.headers.get(CSRF_HEADER) === CSRF_HEADER_VALUE;
}
