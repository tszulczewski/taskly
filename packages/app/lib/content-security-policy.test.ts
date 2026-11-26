import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { themeScript } from "../components/shell/theme-script";
import {
  contentSecurityPolicy,
  createNonce,
  REACT_SHELL_SCRIPT,
  SHELL_SCRIPT_HASHES,
} from "./content-security-policy";

const NONCE = "bm9uY2Utb2YtdGhlLXRlc3Q=";

function directives(policy: string) {
  return new Map(
    policy.split("; ").map((directive) => {
      const [name, ...sources] = directive.split(" ");
      return [name, sources.join(" ")];
    }),
  );
}

const hash = (script: string) => `'sha256-${createHash("sha256").update(script).digest("base64")}'`;

describe("contentSecurityPolicy", () => {
  it("sets the T-07 baseline in production", () => {
    const policy = directives(contentSecurityPolicy({ dev: false, nonce: NONCE }));

    expect(policy.get("default-src")).toBe("'self'");
    expect(policy.get("object-src")).toBe("'none'");
    expect(policy.get("base-uri")).toBe("'self'");
    expect(policy.get("form-action")).toBe("'self'");
    expect(policy.get("frame-ancestors")).toBe("'none'");
    expect(policy.get("connect-src")).toBe("'self'");
  });

  it("allows inline script only by this request's nonce or a shell hash, never 'unsafe-inline' (#101)", () => {
    const policy = directives(contentSecurityPolicy({ dev: false, nonce: NONCE }));
    const scripts = `'self' 'nonce-${NONCE}' ${SHELL_SCRIPT_HASHES.join(" ")}`;

    expect(policy.get("script-src")).toBe(scripts);
    expect(policy.get("script-src-elem")).toBe(scripts);
    expect(policy.get("script-src-attr")).toBe("'none'");
    expect(contentSecurityPolicy({ dev: false, nonce: NONCE })).not.toMatch(
      /script-src[^;]*'unsafe-(inline|hashes)'/,
    );
  });

  it("allows eval only under next dev", () => {
    const policy = directives(contentSecurityPolicy({ dev: true, nonce: NONCE }));

    expect(policy.get("script-src")).toMatch(/ 'unsafe-eval'$/);
    expect(policy.get("script-src-elem")).not.toContain("'unsafe-eval'");
    expect(contentSecurityPolicy({ dev: false, nonce: NONCE })).not.toContain("'unsafe-eval'");
  });

  it("names no other origin", () => {
    expect(contentSecurityPolicy({ dev: false, nonce: NONCE })).not.toMatch(/https?:|\*/);
  });
});

describe("SHELL_SCRIPT_HASHES", () => {
  it("hashes the theme script and React's shell script", () => {
    expect(SHELL_SCRIPT_HASHES).toEqual([hash(themeScript), hash(REACT_SHELL_SCRIPT)]);
  });

  // A React upgrade that changes the script would refuse it on every page; fail here first.
  it("matches the script the installed React writes into a prerendered shell", () => {
    const require = createRequire(import.meta.url);
    const fizz =
      require.resolve("next/dist/compiled/react-dom/cjs/react-dom-server.node.production.js");
    expect(readFileSync(fizz, "utf8")).toContain(JSON.stringify(REACT_SHELL_SCRIPT));
  });
});

describe("createNonce", () => {
  it("returns 128 random bits, base64, different every call", () => {
    const nonce = createNonce();

    expect(Buffer.from(nonce, "base64")).toHaveLength(16);
    expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(createNonce()).not.toBe(nonce);
  });
});
