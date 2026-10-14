import "server-only";
import {
  type ApiResponse,
  ForbiddenError,
  hasCsrfHeader,
  mapError,
  UnauthorizedError,
} from "@taskly/core";
import { getSessionUser } from "@taskly/core/server";

type Handler<Ctx> = (req: Request, ctx: Ctx) => Promise<unknown>;

/**
 * Wraps a Route Handler: CSRF header check on mutations, error → status mapping,
 * `{ ok, data }` envelope. Routes must not write their own try/catch.
 */
export function apiHandler<Ctx = unknown>(fn: Handler<Ctx>) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      if (!hasCsrfHeader(req)) throw new ForbiddenError();
      const data = await fn(req, ctx);
      return Response.json({ ok: true, data } satisfies ApiResponse<unknown>);
    } catch (error) {
      const { status, body } = mapError(error);
      if (status >= 500) console.error("Unhandled API error", error);
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
