import { navigate } from "./screens";
import type { Demo } from "./store";

/**
 * The simulated server. Every answer comes from the scenario controls (P02–P09); nothing leaves
 * the page.
 */
export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** `X-Retry-After` of the simulated 429 (P02, P03): the sign-in window is 10 s (sign-in spec, Edge cases). */
export const retryAfterSeconds = 8;

/** A request that is never answered (P06 "never answers"). */
export const never = () => new Promise<never>(() => {});

/** The 401 of P04: the app signs the person out and shows the sign-in page with s01.11. */
export class SessionExpired extends Error {}

/** One call to the app's API: P06's delay, then P04's 401 if the session was set to expire. */
export async function callApi(demo: Demo, delay = demo.scenarios.delay): Promise<void> {
  const expiring = demo.scenarios.session === "expiring";
  await wait(delay);
  if (expiring) {
    demo.expireSession();
    navigate("s01");
    throw new SessionExpired();
  }
}

/** A change (add, edit, delete, move, completion) as P06 answers it: true when confirmed. */
export async function change(demo: Demo): Promise<boolean> {
  const answer = demo.scenarios.changes;
  await callApi(demo);
  if (answer === "silent") await never();
  return answer === "confirm";
}
