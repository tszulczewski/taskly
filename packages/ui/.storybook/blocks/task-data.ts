import type {
  EstimateField,
  EstimateValues,
  ExpensesText,
  FieldErrors,
  Place,
  TaskFieldErrors,
  TaskFormValues,
  TaskItem,
  TaskText,
  UnestimatedItem,
} from "../../src";
import { bathroom, bedroom, hall, kitchen, livingRoom } from "./place-data";

/**
 * Example tasks and simulated rules for the E01 stories (P1: the app supplies the real ones from
 * `@taskly/core`). Amounts follow tokens rule 5: "1 200–1 500 zł".
 */

/** Messages from spec E01 (UI/UX, Errors); the title message is an example (decision E3). */
export const taskMessages = {
  title: "Enter a title.",
  amount: "Enter an amount like 1 500,50",
  upToBelowAmount: "“Up to” must not be less than the amount.",
  descriptionTooLong: "Enter at most 2 000 characters.",
  overCap: "Enter at most 10 000 000 zł",
  addFailed: "Could not add the task. Try again.",
  saveFailed: "Could not save the task. Try again.",
  rolledBack: "Could not save “Seal the bath”. It is back as it was.",
  moveFailed: (title: string) => `Could not move “${title}”. It is back where it was.`,
  changeFailed: (title: string) => `Could not save “${title}”. It is back as it was.`,
  required: "Enter an amount.",
  estimateFailed: "Could not save the estimate. Try again.",
  /** The roll-up notes of spec E01 (Roll-up messages, Q1); the app writes them into `notice`. */
  sumStarted: (title: string) =>
    `The estimate of “${title}” is now the sum of its subtasks. Your amount is kept and comes back if you delete all subtasks.`,
  sumBack: (title: string, amount: string) =>
    `The estimate of “${title}” is back to your amount: ${amount}.`,
} as const;

const amountPattern = /^(?:\d{1,3}(?:[  ]\d{3})+|\d+)(?:[.,]\d{1,2})?$/;
const maxGrosze = 1_000_000_000;

/** Typed text to grosze, like `parsePlnToGrosze`: null when empty, NaN when it is not an amount. */
export function toGrosze(text: string): number | null {
  const value = text.trim();
  if (value === "") return null;
  if (!amountPattern.test(value)) return Number.NaN;
  const [whole = "0", fraction = ""] = value.replace(/[  ]/g, "").split(/[.,]/);
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** The rules of `estimateFromAmounts` (spec E01): one field is an exact price, both a range. */
export function validateTask(values: TaskFormValues): TaskFieldErrors {
  const errors: TaskFieldErrors = {};
  if (values.title.trim() === "") errors.title = taskMessages.title;
  const amount = toGrosze(values.amount);
  const upTo = toGrosze(values.upTo);
  for (const [name, grosze] of [
    ["amount", amount],
    ["upTo", upTo],
  ] as const) {
    if (Number.isNaN(grosze)) errors[name] = taskMessages.amount;
    else if (grosze !== null && grosze > maxGrosze) errors[name] = taskMessages.overCap;
  }
  if (values.description.trim().length > 2000) errors.description = taskMessages.descriptionTooLong;
  if (errors.amount || errors.upTo) return errors;
  if (amount !== null && upTo !== null && amount > upTo) errors.upTo = taskMessages.upToBelowAmount;
  return errors;
}

const group = (grosze: number) => {
  const whole = Math.floor(grosze / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const rest = grosze % 100;
  return rest === 0 ? whole : `${whole},${rest.toString().padStart(2, "0")}`;
};

/** The form's text for an amount, e.g. "1 200" or "12,50". */
export const amountText = (grosze: number) => group(grosze);

/** An estimate as the app formats it (tokens rule 5): "1 200–1 500 zł", or "500 zł" (R18). */
const estimateText = (min: number, max: number) =>
  min === max ? `${group(min)} zł` : `${group(min)}–${group(max)} zł`;

type Range = [min: number, max: number];

/** The two typed fields as a range: one filled field is an exact price (R18). */
function typedRange(amount: string, upTo: string): Range | null {
  const low = toGrosze(amount);
  const high = toGrosze(upTo);
  if (low === null && high === null) return null;
  return [low ?? (high as number), high ?? (low as number)];
}

/** The form's two fields for a range: an exact price in "Amount" only. */
const fields = (range: Range | null) => ({
  amount: range === null ? "" : amountText(range[0]),
  upTo: range === null || range[0] === range[1] ? "" : amountText(range[1]),
});

/**
 * What the server would send for a row, from its typed amounts (`rollUpEstimate`, spec E01): a
 * task with subtasks shows their sum and how many have none (R12, R13); its own amounts stay in
 * `amount`/`upTo`, unshown, and come back when its last subtask goes (R15). Completed subtasks
 * still count (R14). Stories keep the own amounts there because the real API does not send them.
 */
export function rollUp(item: TaskItem): TaskItem {
  const { unestimatedSubtasks: _, ...rest } = item;
  const own = typedRange(item.amount, item.upTo);
  if (item.subtasks === undefined || item.subtasks.length === 0) {
    return { ...rest, estimate: own === null ? null : estimateText(...own) };
  }
  const subtasks = item.subtasks.map(rollUp);
  const priced = subtasks.flatMap((subtask) => {
    const range = typedRange(subtask.amount, subtask.upTo);
    return range === null ? [] : [range];
  });
  const missing = subtasks.length - priced.length;
  const sum = priced.reduce<Range>(([min, max], [low, high]) => [min + low, max + high], [0, 0]);
  return {
    ...rest,
    subtasks,
    estimate: priced.length === 0 ? null : estimateText(...sum),
    ...(missing > 0 ? { unestimatedSubtasks: missing } : {}),
  };
}

/** Builds a task as the list receives it, from amounts in złoty: `[500]` is an exact price. */
export function task(
  id: string,
  title: string,
  options: {
    estimate?: [number] | [number, number];
    description?: string;
    subtasks?: TaskItem[];
    pending?: boolean;
    error?: string;
    notice?: string;
    important?: boolean;
    urgent?: boolean;
    places?: Place[];
    completed?: boolean;
  } = {},
): TaskItem {
  const [low, high = low] = options.estimate?.map((zloty) => Math.round(zloty * 100)) ?? [];
  return rollUp({
    id,
    title,
    description: options.description ?? null,
    estimate: null,
    ...fields(low === undefined || high === undefined ? null : [low, high]),
    ...(options.subtasks ? { subtasks: options.subtasks } : {}),
    ...(options.pending ? { pending: true } : {}),
    ...(options.error ? { error: options.error } : {}),
    ...(options.notice ? { notice: options.notice } : {}),
    ...(options.important ? { important: true } : {}),
    ...(options.urgent ? { urgent: true } : {}),
    ...(options.places ? { places: options.places } : {}),
    ...(options.completed ? { completed: true } : {}),
  });
}

/** Turns what a form sent into the row the list shows. */
export function fromValues(id: string, values: TaskFormValues, base?: TaskItem): TaskItem {
  return rollUp({
    ...base,
    id,
    title: values.title.trim(),
    description: values.description.trim() === "" ? null : values.description.trim(),
    estimate: null,
    ...fields(typedRange(values.amount, values.upTo)),
  });
}

/** "Add estimate" saves something: at least one amount (R10); else the E01 rules. */
export function validateEstimate(values: EstimateValues): FieldErrors<EstimateField> {
  if (values.amount.trim() === "" && values.upTo.trim() === "") {
    return { amount: taskMessages.required };
  }
  const { amount, upTo } = validateTask({ title: "estimate", description: "", ...values });
  return { ...(amount ? { amount } : {}), ...(upTo ? { upTo } : {}) };
}

/**
 * Future expenses as the server would compute them (R17, R10, R13): the sums of the minimums and of
 * the maximums of open main tasks, each with its estimate from `rollUp`, so a subtask is counted
 * once, inside its task. `unestimated` is what still needs a price (D27): open tasks without
 * subtasks and without an estimate, and open subtasks without one, named with their task.
 */
export function futureExpenses(tasks: TaskItem[]): {
  total: string | null;
  unestimated: UnestimatedItem[];
} {
  const open = tasks.filter((item) => item.completed !== true).map(rollUp);
  const ranges = open.flatMap((item) => {
    if (item.estimate === null) return [];
    const subtasks = item.subtasks ?? [];
    if (subtasks.length === 0) return [typedRange(item.amount, item.upTo) as Range];
    return subtasks.flatMap((subtask) => {
      const range = typedRange(subtask.amount, subtask.upTo);
      return range === null ? [] : [range];
    });
  });
  const sum = ranges.reduce<Range>(([min, max], [low, high]) => [min + low, max + high], [0, 0]);
  return {
    total: ranges.length === 0 ? null : estimateText(...sum),
    unestimated: open.flatMap(({ id, title, estimate, subtasks = [] }) =>
      subtasks.length === 0
        ? estimate === null
          ? [{ id, title }]
          : []
        : subtasks
            .filter(
              (subtask) =>
                subtask.completed !== true && typedRange(subtask.amount, subtask.upTo) === null,
            )
            .map((subtask) => ({ id: subtask.id, title: subtask.title, taskTitle: title })),
    ),
  };
}

export const paintCeiling = task("paint", "Paint the bathroom ceiling", {
  estimate: [1200, 1500],
  description: "Two coats of white matt. Cover the bath and the floor first.",
  subtasks: [
    task("cracks", "Fill the cracks above the window", { estimate: [150, 200] }),
    task("paint-buy", "Buy paint and rollers", {
      estimate: [400, 500],
      description: "10 l of ceiling white, two rollers, masking tape.",
    }),
    task("mask", "Mask the lamp and the sockets"),
  ],
});

export const sealBath = task("seal", "Seal the bath");

export const curtainRods = task("rods", "Hang the curtain rods", { estimate: [180, 250] });

export const pantry = task("pantry", "Finish the pantry shelves", {
  estimate: [900, 1400],
  description: "Oak boards, oiled. Five shelves, the lowest one 40 cm above the floor.",
});

export const longTask = task(
  "splashback",
  "Replace the cracked tile behind the kitchen sink and regrout the whole splashback in a darker colour",
  {
    estimate: [350, 600],
    description:
      "The cracked tile is the third from the left in the second row. Spare tiles are in the garage, in the box marked “kitchen”. Ask the tiler whether the grout colour can match the floor; if not, choose graphite so that the joints do not show dirt.",
  },
);

/** The widest amount a real list is likely to hold (long numbers). */
export const wholeBathroom = task("bathroom", "Renovate the whole bathroom", {
  estimate: [45_000, 62_500.5],
});

/** A typical list: estimates and descriptions on some tasks only (partial data). */
export const someTasks: TaskItem[] = [paintCeiling, curtainRods, sealBath, pantry];

const manyTitles = [
  "Hang the curtain rods",
  "Seal the bath",
  "Fix the dripping kitchen tap",
  "Paint the hallway",
  "Build the decorative wall",
  "Finish the pantry shelves",
  "Replace the bedroom door handle",
  "Mount the bathroom mirror",
  "Install the extractor fan",
  "Lay the balcony tiles",
  "Grout the shower",
  "Fit skirting boards in the living room",
  "Replace the light switches",
  "Insulate the attic hatch",
  "Paint the radiators",
  "Hang the kitchen cabinets",
  "Fix the squeaky stair",
  "Clean the gutters",
  "Install the smoke detectors",
  "Seal the window frames",
  "Repair the garden fence",
  "Replace the toilet seat",
  "Fit the wardrobe doors",
  "Install the outdoor light",
  "Patch the ceiling after the electrician",
  "Varnish the floor in the kids' room",
  "Hang the shelves in the study",
  "Replace the shower head",
  "Mount the TV bracket",
  "Box in the pipes in the bathroom",
];

/** 30 tasks: every third without an estimate, every fourth with subtasks. */
export const manyTasks: TaskItem[] = manyTitles.map((title, index) =>
  task(`many-${index}`, title, {
    ...(index % 3 === 2 ? {} : { estimate: [100 + index * 70, 160 + index * 95] }),
    ...(index % 4 === 0
      ? {
          subtasks: [
            task(`many-${index}-a`, "Buy the materials", { estimate: [60, 90] }),
            task(`many-${index}-b`, "Clean up afterwards"),
          ],
        }
      : {}),
  }),
);

/**
 * A list with order, markers and places in use (E02): several places on one task, markers on
 * some, subtasks with their own places.
 */
export const organizedTasks: TaskItem[] = [
  task("seal", "Seal the bath", { important: true, urgent: true, places: [bathroom] }),
  task("paint", "Paint the bathroom ceiling", {
    estimate: [1200, 1500],
    description: "Two coats of white matt. Cover the bath and the floor first.",
    important: true,
    places: [bathroom],
    subtasks: [
      task("cracks", "Fill the cracks above the window", { estimate: [150, 200] }),
      task("paint-buy", "Buy paint and rollers", {
        estimate: [400, 500],
        urgent: true,
        places: [hall],
      }),
      task("mask", "Mask the lamp and the sockets"),
    ],
  }),
  task("rods", "Hang the curtain rods", {
    estimate: [180, 250],
    places: [bedroom, livingRoom],
  }),
  task("switches", "Replace the light switches", {
    estimate: [300, 450],
    urgent: true,
    places: [kitchen, hall, bedroom, livingRoom],
  }),
  task("pantry", "Finish the pantry shelves", { estimate: [900, 1400], places: [kitchen] }),
];

const polishPlural = new Intl.PluralRules("pl-PL");
const subtaskWord = (count: number) =>
  ({ one: "podzadanie", few: "podzadania", many: "podzadań" })[
    polishPlural.select(count) as "one" | "few" | "many"
  ] ?? "podzadania";

/** Polish text for the E01 components, to check lengths (P5); wording is a proposal. */
export const polishTaskText: Partial<TaskText> = {
  description: "Opis",
  estimate: "Szacunek",
  optional: "(opcjonalnie)",
  title: "Tytuł",
  newTask: "Nowe zadanie",
  newSubtask: "Nowe podzadanie",
  add: "Dodaj",
  adding: "Dodawanie…",
  save: "Zapisz",
  saving: "Zapisywanie…",
  cancel: "Anuluj",
  unexpectedError: "Coś poszło nie tak. Spróbuj ponownie.",
  noEstimate: "Bez szacunku",
  pending: "Zapisywanie…",
  subtaskCount: (count) => `${count} ${subtaskWord(count)}`,
  unestimatedSubtasks: (count) => `${count} ${subtaskWord(count)} bez szacunku`,
  sumOfSubtasks: "Suma podzadań:",
  sumNone: "jeszcze bez szacunku",
  sumHint: "Zmień kwoty w podzadaniach.",
  amount: "Kwota",
  upTo: "do",
  moreActions: (title) => `Więcej akcji dla „${title}”`,
  editTask: (title) => `Edytuj „${title}”`,
  subtasksOf: (title) => `Podzadania „${title}”`,
  addSubtask: "Dodaj podzadanie",
  edit: "Edytuj",
  delete: "Usuń",
  list: "Zadania",
  loading: "Wczytywanie zadań…",
  loadError: "Nie udało się wczytać zadań.",
  retry: "Spróbuj ponownie",
  retrying: "Ponawianie…",
  emptyTitle: "Nie ma jeszcze zadań.",
  emptyBody: "Dodaj pierwszą rzecz do zrobienia.",
  deleteTitle: (title, subtasks) =>
    subtasks === 0
      ? `Usunąć „${title}”?`
      : `Usunąć „${title}” i ${subtasks} ${subtaskWord(subtasks)}?`,
  deleteConfirm: "Usuń zadanie",
  deleting: "Usuwanie…",
  deleteError: "Nie udało się usunąć zadania. Spróbuj ponownie.",
  important: "Ważne",
  urgent: "Pilne",
  places: "Miejsca…",
  moveUp: "Przesuń w górę",
  moveDown: "Przesuń w dół",
  dragHandle: (title) => `Przesuń „${title}”`,
  sortable: "wiersz do przesunięcia",
  dragInstructions:
    "Aby przesunąć zadanie, naciśnij Spację lub Enter, przesuń je strzałkami w górę i w dół, a potem naciśnij Spację lub Enter. Escape anuluje.",
  pickedUp: (title) => `Podniesiono „${title}”.`,
  movedOver: (title, overTitle) => `„${title}” jest teraz w miejscu „${overTitle}”.`,
  dropped: (title, overTitle) => `Przesunięto „${title}” w miejsce „${overTitle}”.`,
  cancelled: (title) => `Anulowano przesuwanie „${title}”.`,
  complete: (title) => `Ukończ „${title}”`,
  subtaskProgressLabel: (done, total) => `Ukończone podzadania: ${done} z ${total}`,
  completeTitle: (title, open) =>
    open === 1
      ? `Ukończyć „${title}” i jego otwarte podzadanie?`
      : `Ukończyć „${title}” i ${open} ${polishPlural.select(open) === "few" ? "otwarte podzadania" : "otwartych podzadań"}?`,
  completeDescription: "Ponowne otwarcie zadania nie otworzy jego podzadań.",
  completeConfirm: "Ukończ zadanie",
};

export const polishTasks: TaskItem[] = [
  task("pl-sufit", "Pomalować sufit w łazience", {
    estimate: [1200, 1500],
    description: "Dwie warstwy białej matowej. Najpierw zabezpieczyć wannę i podłogę.",
    subtasks: [
      task("pl-rysy", "Zaszpachlować rysy nad oknem", { estimate: [150, 200] }),
      task("pl-farba", "Kupić farbę i wałki", { estimate: [400, 500] }),
    ],
  }),
  task("pl-karnisze", "Powiesić karnisze w sypialni", { estimate: [180, 250] }),
  task("pl-wanna", "Uszczelnić wannę silikonem sanitarnym"),
];

/** The Polish list with order, markers and places (E02). */
export const polishOrganizedTasks: TaskItem[] = [
  task("pl-wanna", "Uszczelnić wannę silikonem sanitarnym", {
    important: true,
    urgent: true,
    places: [bathroom],
  }),
  task("pl-sufit", "Pomalować sufit w łazience", {
    estimate: [1200, 1500],
    important: true,
    places: [bathroom],
    subtasks: [
      task("pl-rysy", "Zaszpachlować rysy nad oknem", { estimate: [150, 200] }),
      task("pl-farba", "Kupić farbę i wałki", { estimate: [400, 500], places: [hall] }),
    ],
  }),
  task("pl-karnisze", "Powiesić karnisze w sypialni", {
    estimate: [180, 250],
    urgent: true,
    places: [bedroom, hall],
  }),
  task("pl-polki", "Dokończyć półki w spiżarni", { estimate: [900, 1400], places: [kitchen] }),
];

/**
 * A list in the middle of the work (E03), already in display order (decision 2026-10-21: open
 * first, then completed): one subtask done, one task without an estimate, two tasks done.
 */
export const progressTasks: TaskItem[] = [
  task("seal", "Seal the bath", { important: true }),
  task("paint", "Paint the bathroom ceiling", {
    estimate: [1200, 1500],
    description: "Two coats of white matt. Cover the bath and the floor first.",
    subtasks: [
      task("paint-buy", "Buy paint and rollers", { estimate: [400, 500] }),
      task("mask", "Mask the lamp and the sockets"),
      task("cracks", "Fill the cracks above the window", { estimate: [150, 200], completed: true }),
    ],
  }),
  task("rods", "Hang the curtain rods", { estimate: [180, 250] }),
  task("tap", "Fix the dripping kitchen tap"),
  task("pantry", "Finish the pantry shelves", { estimate: [900, 1400], completed: true }),
  task("pipes", "Box in the pipes in the bathroom", {
    estimate: [600, 800],
    completed: true,
    subtasks: [
      task("pipes-boards", "Cut the plasterboard", { completed: true }),
      task("pipes-paint", "Paint the boxing", { completed: true }),
    ],
  }),
];

/** Every task done: future expenses has nothing left to count. */
export const doneTasks: TaskItem[] = progressTasks.map((item) => ({
  ...item,
  completed: true,
  ...(item.subtasks
    ? { subtasks: item.subtasks.map((subtask) => ({ ...subtask, completed: true })) }
    : {}),
}));

const polishTaskWord = (count: number) =>
  ({ one: "zadanie", few: "zadania", many: "zadań" })[
    polishPlural.select(count) as "one" | "few" | "many"
  ] ?? "zadania";

/** Polish text for the future expenses components, to check lengths (P5); wording is a proposal. */
export const polishExpensesText: Partial<ExpensesText> = {
  label: "Przyszłe wydatki",
  noTotal: "Brak szacunków",
  loading: "Wczytywanie przyszłych wydatków…",
  loadError: "Nie udało się wczytać przyszłych wydatków.",
  retry: "Spróbuj ponownie",
  retrying: "Ponawianie…",
  unestimated: (tasks, subtasks) =>
    `${[
      tasks > 0 ? `${tasks} ${polishTaskWord(tasks)}` : "",
      subtasks > 0 ? `${subtasks} ${subtaskWord(subtasks)}` : "",
    ]
      .filter(Boolean)
      .join(" i ")} bez szacunku`,
  unestimatedRule: "Nie liczą się do przyszłych wydatków, dopóki nie mają szacunku.",
  addEstimate: "Dodaj szacunek",
  addEstimateFor: (title, taskTitle) =>
    taskTitle === undefined
      ? `Dodaj szacunek dla „${title}”`
      : `Dodaj szacunek dla „${title}” w zadaniu „${taskTitle}”`,
  estimateFor: (title, taskTitle) =>
    taskTitle === undefined
      ? `Szacunek dla „${title}”`
      : `Szacunek dla „${title}” w zadaniu „${taskTitle}”`,
  amount: "Kwota",
  upTo: "do",
  optional: "(opcjonalnie)",
  save: "Zapisz",
  saving: "Zapisywanie…",
  cancel: "Anuluj",
  unexpectedError: "Coś poszło nie tak. Spróbuj ponownie.",
};

/** The Polish list in the middle of the work (E03). */
export const polishProgressTasks: TaskItem[] = [
  task("pl-wanna", "Uszczelnić wannę silikonem sanitarnym"),
  task("pl-sufit", "Pomalować sufit w łazience", {
    estimate: [1200, 1500],
    subtasks: [
      task("pl-farba", "Kupić farbę i wałki", { estimate: [400, 500] }),
      task("pl-rysy", "Zaszpachlować rysy nad oknem", { estimate: [150, 200], completed: true }),
    ],
  }),
  task("pl-karnisze", "Powiesić karnisze w sypialni", { estimate: [180, 250] }),
  task("pl-polki", "Dokończyć półki w spiżarni", { estimate: [900, 1400], completed: true }),
];
