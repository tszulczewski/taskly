import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./security-headers";

function directives(policy: string) {
  return new Map(
    policy.split("; ").map((directive) => {
      const [name, ...sources] = directive.split(" ");
      return [name, sources.join(" ")];
    }),
  );
}

describe("contentSecurityPolicy", () => {
  it("sets the T-07 baseline in production", () => {
    const policy = directives(contentSecurityPolicy({ dev: false }));

    expect(policy.get("default-src")).toBe("'self'");
    expect(policy.get("object-src")).toBe("'none'");
    expect(policy.get("base-uri")).toBe("'self'");
    expect(policy.get("form-action")).toBe("'self'");
    expect(policy.get("frame-ancestors")).toBe("'none'");
    expect(policy.get("connect-src")).toBe("'self'");
  });

  it("blocks inline event handlers and eval, and loads script only from this origin", () => {
    const policy = directives(contentSecurityPolicy({ dev: false }));

    expect(policy.get("script-src-attr")).toBe("'none'");
    expect(policy.get("script-src")).toBe("'self' 'unsafe-inline'");
    expect(policy.get("script-src-elem")).toBe("'self' 'unsafe-inline'");
  });

  it("allows eval only under next dev", () => {
    const policy = directives(contentSecurityPolicy({ dev: true }));

    expect(policy.get("script-src")).toBe("'self' 'unsafe-inline' 'unsafe-eval'");
    expect(policy.get("script-src-elem")).toBe("'self' 'unsafe-inline'");
    expect(policy.get("script-src-attr")).toBe("'none'");
  });

  it("names no other origin", () => {
    expect(contentSecurityPolicy({ dev: false })).not.toMatch(/https?:|\*/);
  });
});

describe("securityHeaders", () => {
  it("adds the CSP, framing, sniffing and referrer headers", () => {
    expect(securityHeaders({ dev: false })).toEqual([
      { key: "Content-Security-Policy", value: contentSecurityPolicy({ dev: false }) },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "same-origin" },
    ]);
  });

  it("passes the dev flag through to the CSP", () => {
    expect(securityHeaders({ dev: true })).toContainEqual({
      key: "Content-Security-Policy",
      value: contentSecurityPolicy({ dev: true }),
    });
  });
});
