import { connection } from "next/server";
import { Suspense } from "react";

async function WaitForRequest() {
  await connection();
  return null;
}

/**
 * Renders nothing, at request time, so no page is fully static (threat T-07, #101). A fully static
 * page carries Next's inline RSC payload from the build, with no nonce, and the CSP refuses it. With
 * this hole every page is a prerendered shell plus a per-request resume, and the resume writes that
 * payload with the request's nonce.
 */
export function RequestTimeHole() {
  return (
    <Suspense>
      <WaitForRequest />
    </Suspense>
  );
}
