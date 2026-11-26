import { createHash, randomBytes } from "node:crypto";
import { themeScript } from "../components/shell/theme-script";

/**
 * The one inline script React writes into a Cache Components shell itself (it times the first
 * paint for boundary reveals). The shell is prerendered at build time, without a request, so it
 * carries no nonce; the string is fixed, so a hash allows it. `content-security-policy.test.ts` checks
 * that the installed React still writes exactly this.
 */
export const REACT_SHELL_SCRIPT = "requestAnimationFrame(function(){$RT=performance.now()});";

const sha256 = (script: string) =>
  `'sha256-${createHash("sha256").update(script).digest("base64")}'`;

/** The fixed inline scripts in a prerendered shell: the theme script and React's. */
export const SHELL_SCRIPT_HASHES = [sha256(themeScript), sha256(REACT_SHELL_SCRIPT)];

/** A fresh nonce for one request: 128 random bits. */
export function createNonce(): string {
  return randomBytes(16).toString("base64");
}

/**
 * Content-Security-Policy for one response (threat T-07), set by `proxy.ts`. No
 * `'unsafe-inline'` for script: an inline `<script>` runs only with this request's nonce or one of
 * the shell hashes. Next reads the nonce from the request's CSP header and puts it on every inline
 * script it streams for the request, including the resume of a prerendered shell. Without
 * `'unsafe-inline'` (and without `'unsafe-hashes'`), `javascript:` URLs, inline event handlers and
 * injected `<script>` elements are refused too. `next dev` needs `'unsafe-eval'` for React's error
 * overlay.
 */
export function contentSecurityPolicy({ dev, nonce }: { dev: boolean; nonce: string }): string {
  const scripts = ["'self'", `'nonce-${nonce}'`, ...SHELL_SCRIPT_HASHES].join(" ");
  const directives = [
    "default-src 'self'",
    `script-src ${scripts}${dev ? " 'unsafe-eval'" : ""}`,
    `script-src-elem ${scripts}`,
    "script-src-attr 'none'",
    // React renders `style` attributes, and Radix sets positions inline.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  return directives.join("; ");
}
