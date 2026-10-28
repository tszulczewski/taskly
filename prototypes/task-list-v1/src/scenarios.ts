/**
 * Scenario controls of the review bar (map, section 2; prompt rule 5). They steer the simulated
 * server, never the product: the screens only see what a real server would answer.
 */
export interface Scenarios {
  /** P01: sign-up is closed by default (sign-in spec, Q1). */
  signUpOpen: boolean;
  /** P02: "check" compares the typed email and password with the demo accounts. */
  signIn: "check" | "wrong" | "rateLimited" | "offline";
  /** P03: "check" refuses only an email that is already used. */
  signUp: "check" | "emailUsed" | "rejected" | "closed" | "rateLimited" | "offline";
  /** P04: "none" is account K1 (the guest), so the control only needs these two. */
  session: "valid" | "expiring";
  /** P05: how the task list loads when its page opens. */
  load: "fast" | "slow" | "error" | "errorThenOk" | "badResponse";
  /** P06: the answer to an add, edit, delete, move or completion. */
  changes: "confirm" | "refuse" | "silent";
  /** P06: how long the server takes, in ms. */
  delay: number;
  /** P07 */
  signOut: "ok" | "fail" | "failThenOk";
  /** P09: applies to the next request it fits, then goes back to "none". */
  race: "none" | "deleted" | "conflict";
  /** P12: the page itself, before the list or the form is there. */
  page: "fast" | "slow" | "failed";
}

export const defaultScenarios: Scenarios = {
  signUpOpen: false,
  signIn: "check",
  signUp: "check",
  session: "valid",
  load: "fast",
  changes: "confirm",
  delay: 600,
  signOut: "ok",
  race: "none",
  page: "fast",
};

/** How long "slow" lasts for P05 and P12. */
export const slowMs = 2000;

type Options<K extends keyof Scenarios> = { value: Scenarios[K]; label: string }[];

export const scenarioOptions: { [K in Exclude<keyof Scenarios, "signUpOpen">]: Options<K> } = {
  signIn: [
    { value: "check", label: "checks the demo accounts" },
    { value: "wrong", label: "wrong email or password" },
    { value: "rateLimited", label: "too many attempts (429)" },
    { value: "offline", label: "no network" },
  ],
  signUp: [
    { value: "check", label: "creates the account (a used email is refused)" },
    { value: "emailUsed", label: "email already used (422)" },
    { value: "rejected", label: "details rejected (400)" },
    { value: "closed", label: "sign-up turned off meanwhile" },
    { value: "rateLimited", label: "too many attempts (429)" },
    { value: "offline", label: "no network" },
  ],
  session: [
    { value: "valid", label: "valid" },
    { value: "expiring", label: "expires at the next request (401)" },
  ],
  load: [
    { value: "fast", label: "fast" },
    { value: "slow", label: "slow (skeleton, 2 s)" },
    { value: "error", label: "fails" },
    { value: "errorThenOk", label: "fails once, then loads" },
    { value: "badResponse", label: "bad server response" },
  ],
  changes: [
    { value: "confirm", label: "confirms" },
    { value: "refuse", label: "refuses" },
    { value: "silent", label: "never answers" },
  ],
  delay: [
    { value: 0, label: "0 s" },
    { value: 600, label: "0.6 s" },
    { value: 1500, label: "1.5 s" },
    { value: 3000, label: "3 s" },
  ],
  signOut: [
    { value: "ok", label: "succeeds" },
    { value: "fail", label: "fails" },
    { value: "failThenOk", label: "fails once, then succeeds" },
  ],
  race: [
    { value: "none", label: "none" },
    { value: "deleted", label: "task deleted in another tab (404 at the next edit or subtask)" },
    { value: "conflict", label: "position conflict (409 at the next add or move)" },
  ],
  page: [
    { value: "fast", label: "fast" },
    { value: "slow", label: "slow (skeleton, 2 s)" },
    { value: "failed", label: "did not open (task list only)" },
  ],
};

/** P08: replaces the signed-in account's list (it is an action, not a lasting setting). */
export type Dataset = "full" | "empty" | "many";

export const datasetOptions: { value: Dataset; label: string }[] = [
  { value: "full", label: "K2's list (4 tasks)" },
  { value: "empty", label: "empty list (as K3)" },
  { value: "many", label: "30 tasks, long texts" },
];
