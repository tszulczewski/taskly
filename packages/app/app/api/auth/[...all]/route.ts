import { authRouteHandlers } from "@taskly/core/server";

// Resolved per request so `next build` does not need runtime secrets.
export const GET = (req: Request) => authRouteHandlers().GET(req);
export const POST = (req: Request) => authRouteHandlers().POST(req);
