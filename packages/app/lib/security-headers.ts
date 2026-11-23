export type SecurityHeader = { key: string; value: string };

/**
 * Content-Security-Policy for every response (threat T-07).
 *
 * Inline `<script>` elements stay allowed: with `cacheComponents` the prerendered shell carries
 * Next's inline bootstrap and RSC payload scripts, written at build time, so no per-request nonce
 * can reach them, and the payload changes with every page, so no hash can list it. What the policy
 * blocks instead: inline event handlers (`script-src-attr 'none'`; markup inserted on the client
 * through `innerHTML` can run script only that way, since `<script>` inserted so never runs),
 * `eval` in production, scripts, requests, frames and plugins from other origins, `<base>`
 * hijacking, and framing. `next dev` needs `'unsafe-eval'` for React's error overlay.
 */
export function contentSecurityPolicy({ dev }: { dev: boolean }): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "script-src-elem 'self' 'unsafe-inline'",
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

/** Headers for every response, page and API alike. */
export function securityHeaders({ dev }: { dev: boolean }): SecurityHeader[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy({ dev }) },
    // `frame-ancestors` covers current browsers; this covers the ones that ignore it.
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Not `no-referrer`: that makes the browser send `Origin: null` on form posts.
    { key: "Referrer-Policy", value: "same-origin" },
  ];
}
