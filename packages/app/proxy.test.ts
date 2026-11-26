import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { config, proxy } from "./proxy";

const nonceOf = (policy: string | null) => policy?.match(/'nonce-([^']+)'/)?.[1];
// What `NextResponse.next({ request })` hands on to the render, as Next encodes it.
const forwarded = (response: Response, name: string) =>
  response.headers.get(`x-middleware-request-${name}`);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy", () => {
  it("sends the same nonce CSP to the render and to the browser", () => {
    const response = proxy(new NextRequest("http://localhost/sign-in"));
    const policy = response.headers.get("Content-Security-Policy");

    expect(policy).toMatch(/script-src 'self' 'nonce-[^']+'/);
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(forwarded(response, "content-security-policy")).toBe(policy);
  });

  it("keeps the request's own headers", () => {
    const request = new NextRequest("http://localhost/", { headers: { cookie: "a=b" } });

    expect(forwarded(proxy(request), "cookie")).toBe("a=b");
  });

  it("uses a fresh nonce for every request", () => {
    const policy = () =>
      proxy(new NextRequest("http://localhost/")).headers.get("Content-Security-Policy");

    expect(nonceOf(policy())).not.toBe(nonceOf(policy()));
  });

  it("allows eval only under next dev", () => {
    const policy = () =>
      proxy(new NextRequest("http://localhost/")).headers.get("Content-Security-Policy");

    vi.stubEnv("NODE_ENV", "production");
    expect(policy()).not.toContain("'unsafe-eval'");
    vi.stubEnv("NODE_ENV", "development");
    expect(policy()).toContain("'unsafe-eval'");
  });

  it("runs on pages and the API, not on build output or the favicon", () => {
    const [source] = config.matcher;
    const matches = (path: string) => new RegExp(`^${source}$`).test(path);

    expect(["/", "/sign-in", "/api/auth/ok", "/missing"].filter(matches)).toHaveLength(4);
    expect(["/_next/static/chunks/a.js", "/_next/image", "/favicon.ico"].some(matches)).toBe(false);
  });
});
