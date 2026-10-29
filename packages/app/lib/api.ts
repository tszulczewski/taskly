import "server-only";
import {
  type ApiResponse,
  ForbiddenError,
  hasCsrfHeader,
  mapError,
  type ResponseSchema,
  UnauthorizedError,
} from "@taskly/core";
import { getSessionUser } from "@taskly/core/server";

type Handler<Ctx, T> = (req: Request, ctx: Ctx) => Promise<T>;

export type ApiHandlerOptions<T> = {
  /** Checks the success `data` before it is sent; the parsed value (unknown keys stripped) is sent. */
  response?: ResponseSchema<T>;
};

/**
 * Thrown when a handler's result fails its response schema. It is not a `ZodError`, so `mapError`
 * turns it into the generic 500, never a 400 with field errors, and it carries no response values.
 */
class OutputContractError extends Error {}

function checkOutput<T>(schema: ResponseSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new OutputContractError();
  return result.data;
}

function logFailure(req: Request, error: unknown): void {
  // The output's ZodError would hold row values (titles, descriptions), so it is never logged.
  if (error instanceof OutputContractError) {
    console.error(
      `Response failed its output contract: ${req.method} ${new URL(req.url).pathname}`,
    );
  } else {
    console.error("Unhandled API error", error);
  }
}

/**
 * Wraps a Route Handler: CSRF header check on mutations, error → status mapping,
 * `{ ok, data }` envelope, and the optional output check (`options.response`).
 * Routes must not write their own try/catch.
 */
export function apiHandler<Ctx = unknown, T = unknown>(
  fn: Handler<Ctx, NoInfer<T>>,
  options: ApiHandlerOptions<T> = {},
) {
  const { response } = options;
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      if (!hasCsrfHeader(req)) throw new ForbiddenError();
      const result = await fn(req, ctx);
      const data = response ? checkOutput(response, result) : result;
      return Response.json({ ok: true, data } satisfies ApiResponse<unknown>);
    } catch (error) {
      const { status, body } = mapError(error);
      if (status >= 500) logFailure(req, error);
      return Response.json(body, { status });
    }
  };
}

/** Resolves the Better Auth session user or throws UnauthorizedError (401). */
export async function requireUser(req: Request) {
  const user = await getSessionUser(req.headers);
  if (!user) throw new UnauthorizedError();
  return user;
}
