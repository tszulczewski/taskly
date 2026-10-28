/** Screens of the approved map (`prototypes/konta-i-role/mapa-ekranow.md`). Ids never change. */
export interface ScreenInfo {
  id: ScreenId;
  /** Short name for the review bar. */
  short: string;
  name: string;
  summary: string;
  /** The note under the screen (prompt, stage 3): stories, what is simulated, what is open. */
  note: { stories: string; simulated: string; open: string };
}

export const screenIds = ["s01", "s02", "s03", "s04", "s05", "s06", "s07", "s08"] as const;
export type ScreenId = (typeof screenIds)[number];

export const screens: ScreenInfo[] = [
  {
    id: "s01",
    short: "Sign in",
    name: "Sign in (/sign-in)",
    summary: "Guest. Sign in with a demo account; you always land on the task list.",
    note: {
      stories:
        "#24-DW1, #24-DW3; sign-in spec Q1, Q7, Q8, Q10, Messages, Edge cases; map L10, L12, L16.",
      simulated:
        "The accounts live in this page's memory; there is no cookie, session or Better Auth. Server answers come from P02, the 429 limit too (3 tries in 10 s are not counted; the wait is a fixed 8 seconds). The session read is P12; a signed-in person sees a gate card instead of the redirect.",
      open: "Forgotten password (L16: later). Field-error wording is the design system's example (E3), not the spec's.",
    },
  },
  {
    id: "s02",
    short: "Sign up",
    name: "Sign up, open (/sign-up)",
    summary: "Guest, only while sign-up is open (P01). A new account starts with an empty list.",
    note: {
      stories: "Sign-in spec Q1, Q2, Q4, Q10, Messages; #24-DW2; map L11, L12.",
      simulated:
        'No account is created anywhere and no email is sent; the new account lives in this page. Answers come from P03; "sign-up open" (ALLOW_SIGN_UP) is P01.',
      open: "Where the name is shown (L05: not in version 1).",
    },
  },
  {
    id: "s03",
    short: "Sign-up closed",
    name: "Sign up, closed (/sign-up)",
    summary: "Guest, sign-up closed (the default). No form, only a way back to sign-in.",
    note: {
      stories: "#24-DW2; sign-in spec Q1.",
      simulated:
        "P01 stands for ALLOW_SIGN_UP. The refused direct POST has no screen; it stays an API test.",
      open: "Nothing beyond the map.",
    },
  },
  {
    id: "s04",
    short: "Task list",
    name: "Task list (/) in the app shell",
    summary:
      "Owner. Quick add with the amounts in one row; tasks with a range, an exact price or the sum of their subtasks.",
    note: {
      stories:
        "#15-AC1–AC4, #15-AC6, #15-AC7, #16-AC3, #24-DW1, #24-DW3; tasks spec UI/UX and Edge cases (revision 2026-10-28: R12–R18, C1); map L13, L14, L21, L22; extension s04.22–s04.29 (E02 order, E03 completion, owner's request; moved to the E02/E03 decisions file); extension s04.30–s04.35 (2026-10-28).",
      simulated:
        "The server: list load (P05), changes (P06), races (P09), page load (P12), session expiry (P04). A move only changes the order in this page; there is no fractional position.",
      open: "#15-AC5 has no screen (L01: API test). How the theme choice is remembered (L06). Offline (L17: not in version 1). Future expenses and “Add estimate” in the row belong to E03 (C4, C5).",
    },
  },
  {
    id: "s05",
    short: "Task opened",
    name: "Task opened in its row (a view in s04)",
    summary:
      "“Decorative wall” is opened: its estimate is the sum of the subtasks shown under it, each with its own amount.",
    note: {
      stories: "#16-AC1, #16-AC2, #16-AC3 (R12, R13); map L07; s05.3 replaced by s05.8.",
      simulated:
        'On arrival the prototype opens "Decorative wall" itself, with the same clicks a person would make. The sum is computed in this page, as the server would on read.',
      open: "Whether several tasks may be open at once (the design system's proposal).",
    },
  },
  {
    id: "s06",
    short: "Edit",
    name: "Edit in place (a view in s04)",
    summary: "“Curtain rods” opened for editing from its “…” menu; the row changes after saving.",
    note: {
      stories:
        '#16-AC4 (R12), #15-AC6 (R18); tasks spec UI/UX "Edit"; map L08, L15; s06.7 replaced by s06.10.',
      simulated:
        'Saving answers from P06; "deleted in another tab" (404) and "got a subtask in another tab" (409) are P09. The subtask from the other tab is "Bathroom", without an estimate.',
      open: "How long the deleted row stays (here 3 s).",
    },
  },
  {
    id: "s07",
    short: "Add subtask",
    name: "Add a subtask (a view in s05)",
    summary:
      "“New subtask” under “Decorative wall”, in the quick-add layout; the parent's sum grows when it is saved.",
    note: {
      stories:
        "#16-AC1, #16-AC2, #16-AC3 (#16-AC5 has no screen, L01); s07.1 and s07.4 replaced by s07.8–s07.11.",
      simulated:
        'Adding answers from P06; "parent deleted" (404) is P09. The note about the sum is written by this page, as the app would after the server confirmed.',
      open: "#16-AC5 stays an API test (L01).",
    },
  },
  {
    id: "s08",
    short: "Delete",
    name: "Delete confirmation (a dialog over s04)",
    summary: "Deleting “Decorative wall” asks first and names its subtasks.",
    note: {
      stories:
        'Tasks spec UI/UX "Delete" and "Roll-up messages"; #16-AC2 (R15); map L08; design-system decisions O4, W1.',
      simulated:
        "Deleting answers from P06. The modal dialog covers the review bar: close it first, or press Alt+Shift+R.",
      open: "Nothing beyond the map (there is no undo, as the spec says).",
    },
  },
];

export const isScreenId = (value: string): value is ScreenId =>
  (screenIds as readonly string[]).includes(value);

/** Asks the review engine to show a screen; it records it for "← Back". */
export function navigate(id: ScreenId) {
  document.dispatchEvent(new CustomEvent("prototype:navigate", { detail: id }));
}
