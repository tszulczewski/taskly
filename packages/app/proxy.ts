import { type NextRequest, NextResponse } from "next/server";
import { contentSecurityPolicy, createNonce } from "./lib/content-security-policy";

/**
 * A per-request nonce CSP on every response (threat T-07). The policy goes on the request too:
 * Next reads the nonce from there and adds it to the inline scripts it renders.
 */
export function proxy(request: NextRequest) {
  const policy = contentSecurityPolicy({
    dev: process.env.NODE_ENV === "development",
    nonce: createNonce(),
  });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  // Build output and the favicon are files, not documents: a CSP there protects nothing.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
