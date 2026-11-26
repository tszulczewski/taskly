export type SecurityHeader = { key: string; value: string };

/** Headers for every response, page and API alike, set in `next.config.ts`; the CSP is per request. */
export function securityHeaders(): SecurityHeader[] {
  return [
    // `frame-ancestors` covers current browsers; this covers the ones that ignore it.
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Not `no-referrer`: that makes the browser send `Origin: null` on form posts.
    { key: "Referrer-Policy", value: "same-origin" },
  ];
}
