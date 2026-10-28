import type { Dataset, Scenarios } from "./scenarios";
import type { ScreenId } from "./screens";
import type { AccountId } from "./store";

/**
 * "Go to state" in the review bar: every state of the map (section 1 and the s04 extension) with
 * the setup that reaches it and what to click then. Choosing one resets the scenario controls to
 * their defaults plus `scenarios`, signs in `account` (K1 on the sign-in pages, K2 on the task
 * screens unless given), puts that account's list back to its demo data (or `dataset`) on the task
 * screens, and opens the screen as a fresh page.
 */
export interface StateGuide {
  id: string;
  screen: ScreenId;
  label: string;
  /** What to do on the screen; empty when the state shows on arrival. */
  hint: string;
  account?: AccountId;
  scenarios?: Partial<Scenarios>;
  dataset?: Dataset;
  /** Set once the list is shown, so they act on the next change and not on the page load. */
  after?: Partial<Scenarios>;
  /** Not in the prototype (map, L01): it stays an API test. */
  outside?: true;
}

const marta = "marta@taskly.test / remont-demo-2026";
const slowServer = { delay: 3000 };

export const stateGuide: StateGuide[] = [
  { id: "s01.1", screen: "s01", label: "sign-up closed", hint: "No “Create an account” link." },
  {
    id: "s01.2",
    screen: "s01",
    label: "sign-up open",
    hint: "The “Create an account” link is there.",
    scenarios: { signUpOpen: true },
  },
  {
    id: "s01.3",
    screen: "s01",
    label: "password shown",
    hint: "Type a password, press the eye, then “Sign in”: it is hidden again.",
  },
  {
    id: "s01.4",
    screen: "s01",
    label: "field errors",
    hint: "Press “Sign in” with empty fields, or type “marta@” as the email.",
  },
  {
    id: "s01.5",
    screen: "s01",
    label: "signing in",
    hint: `Sign in with ${marta}: “Signing in…” for 3 s.`,
    scenarios: slowServer,
  },
  {
    id: "s01.6",
    screen: "s01",
    label: "wrong email or password",
    hint: "Sign in with any email and password.",
    scenarios: { signIn: "wrong" },
  },
  {
    id: "s01.7",
    screen: "s01",
    label: "too many attempts",
    hint: "Sign in with any email and password.",
    scenarios: { signIn: "rateLimited" },
  },
  {
    id: "s01.8",
    screen: "s01",
    label: "no network",
    hint: "Sign in with any email and password.",
    scenarios: { signIn: "offline" },
  },
  {
    id: "s01.9",
    screen: "s01",
    label: "already signed in",
    hint: "The gate says where the app sends you.",
    account: "K2",
  },
  {
    id: "s01.10",
    screen: "s01",
    label: "signed in",
    hint: `Sign in with ${marta}: the task list opens.`,
  },
  {
    id: "s01.11",
    screen: "s04",
    label: "session expired",
    hint: "The list's first request gets a 401: the sign-in page says the session expired.",
    scenarios: { session: "expiring" },
  },
  {
    id: "s01.12",
    screen: "s01",
    label: "page loading",
    hint: "The card skeleton shows for 2 s.",
    scenarios: { page: "slow" },
  },

  {
    id: "s02.1",
    screen: "s02",
    label: "default",
    hint: "Name, email, password with its hint.",
    scenarios: { signUpOpen: true },
  },
  {
    id: "s02.2",
    screen: "s02",
    label: "password shown",
    hint: "Type a password and press the eye.",
    scenarios: { signUpOpen: true },
  },
  {
    id: "s02.3",
    screen: "s02",
    label: "field errors",
    hint: "“Create account” with empty fields, a name of spaces or a 9-character password.",
    scenarios: { signUpOpen: true },
  },
  {
    id: "s02.4",
    screen: "s02",
    label: "creating the account",
    hint: "Fill in the form and send it: “Creating account…” for 3 s.",
    scenarios: { signUpOpen: true, ...slowServer },
  },
  {
    id: "s02.5",
    screen: "s02",
    label: "email already used",
    hint: "Sign up with marta@taskly.test (any name, 10+ characters of password).",
    scenarios: { signUpOpen: true },
  },
  {
    id: "s02.6",
    screen: "s02",
    label: "details rejected",
    hint: "Fill in the form and send it.",
    scenarios: { signUpOpen: true, signUp: "rejected" },
  },
  {
    id: "s02.7",
    screen: "s02",
    label: "sign-up turned off meanwhile",
    hint: "Fill in the form and send it.",
    scenarios: { signUpOpen: true, signUp: "closed" },
  },
  {
    id: "s02.8",
    screen: "s02",
    label: "too many attempts",
    hint: "Fill in the form and send it.",
    scenarios: { signUpOpen: true, signUp: "rateLimited" },
  },
  {
    id: "s02.9",
    screen: "s02",
    label: "no network",
    hint: "Fill in the form and send it.",
    scenarios: { signUpOpen: true, signUp: "offline" },
  },
  {
    id: "s02.10",
    screen: "s02",
    label: "already signed in",
    hint: "The gate says where the app sends you.",
    account: "K2",
    scenarios: { signUpOpen: true },
  },
  {
    id: "s02.11",
    screen: "s02",
    label: "account created",
    hint: "Sign up as Jan Kowal, jan@taskly.test, pierwszy-dom-01 (or any new email): an empty list opens.",
    scenarios: { signUpOpen: true },
  },
  {
    id: "s02.12",
    screen: "s02",
    label: "page loading",
    hint: "The card skeleton shows for 2 s.",
    scenarios: { signUpOpen: true, page: "slow" },
  },

  { id: "s03.1", screen: "s03", label: "default", hint: "No form, a link back to sign-in." },
  {
    id: "s03.2",
    screen: "s03",
    label: "already signed in",
    hint: "The gate says where the app sends you.",
    account: "K2",
  },
  {
    id: "s03.3",
    screen: "s03",
    label: "page loading",
    hint: "The card skeleton shows for 2 s.",
    scenarios: { page: "slow" },
  },

  {
    id: "s04.1",
    screen: "s04",
    label: "not signed in",
    hint: "The gate says where the app sends a guest.",
    account: "K1",
  },
  {
    id: "s04.2",
    screen: "s04",
    label: "loading",
    hint: "Three skeleton rows for 2 s.",
    scenarios: { load: "slow" },
  },
  {
    id: "s04.3",
    screen: "s04",
    label: "empty",
    hint: "Focus is in the title of “New task”.",
    dataset: "empty",
  },
  {
    id: "s04.4",
    screen: "s04",
    label: "load failed",
    hint: "“Could not load your tasks.” with “Try again”.",
    scenarios: { load: "error" },
  },
  {
    id: "s04.5",
    screen: "s04",
    label: "trying again",
    hint: "Press “Try again”: “Trying again…”, then the list.",
    scenarios: { load: "errorThenOk", delay: 1500 },
  },
  { id: "s04.6", screen: "s04", label: "default", hint: "Tasks with and without an estimate." },
  {
    id: "s04.7",
    screen: "s04",
    label: "quick add with details",
    hint: "Open “Details” under “New task”.",
  },
  {
    id: "s04.8",
    screen: "s04",
    label: "quick add field errors",
    hint: "Add with no title; min 2 000 and max 1 500; only a min; “12,5x”; 20 000 000.",
  },
  {
    id: "s04.9",
    screen: "s04",
    label: "adding",
    hint: "Add a task: a grey “Saving…” row at the end for 3 s.",
    scenarios: slowServer,
  },
  {
    id: "s04.10",
    screen: "s04",
    label: "added",
    hint: "Add a task with Details min 1 500, max 2 000 (or 12,50): highlighted, focus back in the title.",
  },
  {
    id: "s04.11",
    screen: "s04",
    label: "add refused",
    hint: "Add a task: the row goes, the message is above the form, the text stays.",
    scenarios: { changes: "refuse" },
  },
  {
    id: "s04.12",
    screen: "s04",
    label: "add conflict (409)",
    hint: "Add a task: the form shows the server's message “Please try again”, the text stays.",
    scenarios: { race: "conflict" },
  },
  {
    id: "s04.13",
    screen: "s04",
    label: "someone else's list (404)",
    hint: "Not in the prototype (L01): it stays an API test.",
    outside: true,
  },
  {
    id: "s04.14",
    screen: "s04",
    label: "session expired during a change",
    hint: "Type a task and add it: 401, the sign-in page with s01.11; the typed text is gone.",
    after: { session: "expiring" },
  },
  {
    id: "s04.15",
    screen: "s04",
    label: "signing out",
    hint: "Press “Sign out”: busy for 3 s.",
    scenarios: slowServer,
  },
  {
    id: "s04.16",
    screen: "s04",
    label: "sign-out failed",
    hint: "Press “Sign out”: the message is in the header; press it again to succeed.",
    scenarios: { signOut: "failThenOk" },
  },
  {
    id: "s04.17",
    screen: "s04",
    label: "signed out",
    hint: "Press “Sign out”: the sign-in page.",
  },
  {
    id: "s04.18",
    screen: "s04",
    label: "bad server response",
    hint: "Shown as a failed load (s04.4).",
    scenarios: { load: "badResponse" },
  },
  {
    id: "s04.19",
    screen: "s04",
    label: "many tasks, long texts",
    hint: "30 tasks; the last has a 200-character title and a 2000-character description.",
    dataset: "many",
  },
  {
    id: "s04.20",
    screen: "s04",
    label: "dark and light theme",
    hint: "Switch the theme in the header (or in the review bar).",
  },
  {
    id: "s04.21",
    screen: "s04",
    label: "page did not open",
    hint: "“Sign out” works; set P12 to “fast” and press “Try again”.",
    scenarios: { page: "failed" },
  },
  {
    id: "s04.22",
    screen: "s04",
    label: "dragging",
    hint: "Drag a handle (640 px and up), long-press a row on a phone, or focus a handle and use Space, arrows, Space.",
  },
  {
    id: "s04.23",
    screen: "s04",
    label: "Move up / Move down",
    hint: "“…” of a task → “Move up” or “Move down”.",
  },
  {
    id: "s04.24",
    screen: "s04",
    label: "move refused",
    hint: "Move a task: it goes back with a message in its row.",
    scenarios: { changes: "refuse" },
  },
  {
    id: "s04.25",
    screen: "s04",
    label: "completed",
    hint: "Tick “Curtain rods”: crossed out, last, focus on its checkbox.",
  },
  {
    id: "s04.26",
    screen: "s04",
    label: "complete with open subtasks",
    hint: "Tick “Decorative wall”: the dialog names its 5 open subtasks.",
  },
  {
    id: "s04.27",
    screen: "s04",
    label: "reopened",
    hint: "Complete a task, then untick it: it goes first.",
  },
  {
    id: "s04.28",
    screen: "s04",
    label: "completion refused",
    hint: "Tick a task: it goes back with a message in its row.",
    scenarios: { changes: "refuse" },
  },
  {
    id: "s04.29",
    screen: "s04",
    label: "completed cannot move",
    hint: "Complete a task: no handle, and its “…” has no “Move up / Move down”.",
  },

  {
    id: "s05.1",
    screen: "s04",
    label: "closed",
    hint: "Each task shows its title, estimate and “N subtasks”.",
  },
  { id: "s05.2", screen: "s05", label: "opened", hint: "Description, subtasks, “Add subtask”." },
  {
    id: "s05.3",
    screen: "s05",
    label: "parent estimate unchanged",
    hint: "“Decorative wall” keeps 350–660 zł next to its subtasks' amounts.",
  },
  {
    id: "s05.4",
    screen: "s05",
    label: "“…” menu",
    hint: "“…” of the task, then of a subtask: the subtask has no “Add subtask”.",
  },
  {
    id: "s05.5",
    screen: "s04",
    label: "row in progress",
    hint: "Add a task and open its “…” while it says “Saving…”: the actions are blocked.",
    scenarios: slowServer,
  },
  {
    id: "s05.6",
    screen: "s04",
    label: "no description, no subtasks",
    hint: "Open “Pantry wall finish”: only “Add subtask”.",
  },
  {
    id: "s05.7",
    screen: "s04",
    label: "long title",
    hint: "Scroll to the last task: its title grows downwards.",
    dataset: "many",
  },

  { id: "s06.1", screen: "s06", label: "default", hint: "The form is filled in." },
  {
    id: "s06.2",
    screen: "s06",
    label: "field errors",
    hint: "Clear the title, or make min bigger than max, and save.",
  },
  {
    id: "s06.3",
    screen: "s06",
    label: "saving",
    hint: "Save: “Saving…” for 3 s; the row changes only after that.",
    scenarios: slowServer,
  },
  {
    id: "s06.4",
    screen: "s06",
    label: "save refused",
    hint: "Save: the form stays open with your text and a message.",
    scenarios: { changes: "refuse" },
  },
  {
    id: "s06.5",
    screen: "s06",
    label: "estimate cleared",
    hint: "Clear both amounts and save: “No estimate”.",
  },
  {
    id: "s06.6",
    screen: "s06",
    label: "cancelled",
    hint: "“Cancel” or Escape: focus back on “…”.",
  },
  {
    id: "s06.7",
    screen: "s05",
    label: "subtask estimate edited",
    hint: "“…” of “TV mount” → Edit, change the amounts, save: the parent keeps 350–660 zł.",
  },
  {
    id: "s06.8",
    screen: "s06",
    label: "task deleted elsewhere (404)",
    hint: "Save: the message shows in the form, then the list drops the task.",
    scenarios: { race: "deleted" },
  },

  { id: "s07.1", screen: "s07", label: "default", hint: "“Cancel” or Escape closes it." },
  {
    id: "s07.2",
    screen: "s07",
    label: "field errors",
    hint: "Add with no title, or min bigger than max.",
  },
  {
    id: "s07.3",
    screen: "s07",
    label: "adding",
    hint: "Add a subtask: a “Saving…” row at the end of the subtasks for 3 s.",
    scenarios: slowServer,
  },
  {
    id: "s07.4",
    screen: "s07",
    label: "added",
    hint: "Add a subtask with min 300, max 400: the parent keeps its estimate.",
  },
  {
    id: "s07.5",
    screen: "s07",
    label: "add refused",
    hint: "Add a subtask: it goes, with a message above the form.",
    scenarios: { changes: "refuse" },
  },
  {
    id: "s07.6",
    screen: "s07",
    label: "parent deleted elsewhere (404)",
    hint: "Add a subtask: the message shows, then the list drops the task.",
    scenarios: { race: "deleted" },
  },
  {
    id: "s07.7",
    screen: "s07",
    label: "someone else's task",
    hint: "Not in the prototype (L01): it stays an API test.",
    outside: true,
  },

  {
    id: "s08.1",
    screen: "s04",
    label: "task without subtasks",
    hint: "“…” of “Pantry wall finish” → Delete.",
  },
  { id: "s08.2", screen: "s08", label: "with subtasks", hint: "The dialog names the 5 subtasks." },
  {
    id: "s08.3",
    screen: "s05",
    label: "a subtask",
    hint: "“…” of a subtask → Delete.",
  },
  {
    id: "s08.4",
    screen: "s08",
    label: "deleting",
    hint: "Press “Delete”: “Deleting…” for 3 s.",
    scenarios: slowServer,
  },
  {
    id: "s08.5",
    screen: "s08",
    label: "delete failed",
    hint: "Press “Delete”: the message is in the dialog.",
    scenarios: { changes: "refuse" },
  },
  {
    id: "s08.6",
    screen: "s08",
    label: "cancelled",
    hint: "“Cancel” or Escape: focus back on “…”.",
  },
  {
    id: "s08.7",
    screen: "s04",
    label: "last task deleted",
    hint: "Ewa (K4) has one task: delete “Paint the hallway”; focus goes to the empty state.",
    account: "K4",
  },
];
