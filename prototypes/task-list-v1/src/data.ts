import type { TaskItem } from "@taskly/ui";
import { task } from "../../../packages/ui/.storybook/blocks/task-data";

/**
 * Demo accounts and lists from the screen map (section 3). Everything is fictitious; the
 * `taskly.test` domain does not exist. Passwords live only in this page's memory.
 */
export interface Account {
  id: string;
  name: string;
  email: string;
  password: string;
  listName: string;
  tasks: TaskItem[];
}

export const listName = "My renovation";

const notInWallEstimate = "Not included in the wall estimate";

/** K2's list: names from the brief, amounts from the owner (L20). */
export const martaTasks = (): TaskItem[] => [
  task("rods", "Curtain rods", {
    description: "Bathroom, living room and dining room",
    estimate: [1070, 1400],
  }),
  task("wall", "Decorative wall", {
    description: "Living room. Without the TV cabinet, the TV mount and the sockets",
    estimate: [350, 660],
    subtasks: [
      task("wall-priming", "Priming"),
      task("wall-plaster", "Decorative plaster"),
      task("wall-impregnation", "Impregnation"),
      task("wall-mount", "TV mount", { description: notInWallEstimate, estimate: [200, 400] }),
      task("wall-cabinet", "TV cabinet", { description: notInWallEstimate, estimate: [500, 1000] }),
    ],
  }),
  task("pantry", "Pantry wall finish", { estimate: [770, 1210] }),
  task("lawn", "Sow the rest of the lawn", {
    description: "Second bag of seed, prepare the soil again",
    estimate: [390, 660],
  }),
];

export const demoAccounts = (): Account[] => [
  {
    id: "K2",
    name: "Marta Zielińska",
    email: "marta@taskly.test",
    password: "remont-demo-2026",
    listName,
    tasks: martaTasks(),
  },
  {
    id: "K4",
    name: "Ewa Lis",
    email: "ewa@taskly.test",
    password: "druga-lista-02",
    listName,
    tasks: [task("hallway", "Paint the hallway")],
  },
];

/** K3 is the account the demo sign-up creates (s02.11); it does not exist before. */
export const janSignUp = {
  name: "Jan Kowal",
  email: "jan@taskly.test",
  password: "pierwszy-dom-01",
};

/** K3 when the review bar switches to it before anyone signed up: the same empty list. */
export const janAccount = (): Account => ({ id: "K3", ...janSignUp, listName, tasks: [] });

/** Repeats `text` (whole words) up to exactly `length` characters. */
const fill = (text: string, length: number) => {
  let out = text;
  while (out.length < length) out += ` ${text}`;
  return `${out.slice(0, length - 1).trimEnd()}.`.padEnd(length, ".");
};

/**
 * P08 "30 tasks" (map, section 3): K2's names with numbers, then one task with a 200-character
 * title and a 2000-character description (the spec's field limits). No new names or amounts.
 */
export const manyTasks = (): TaskItem[] => {
  const base = martaTasks();
  const numbered = Array.from({ length: 29 }, (_, index) => {
    const source = base[index % base.length];
    if (!source) throw new Error("K2's list is empty.");
    const copy = Math.floor(index / base.length) + 1;
    const suffix = (id: string) => `${id}-${index}`;
    return {
      ...source,
      id: suffix(source.id),
      title: copy === 1 ? source.title : `${source.title} ${copy}`,
      ...(source.subtasks
        ? { subtasks: source.subtasks.map((sub) => ({ ...sub, id: suffix(sub.id) })) }
        : {}),
    };
  });
  const long = task(
    "long",
    fill(
      "Decorative wall in the living room with priming, decorative plaster and impregnation",
      200,
    ),
    {
      description: fill(
        "Living room. Without the TV cabinet, the TV mount and the sockets. Priming first, then the decorative plaster, then impregnation.",
        2000,
      ),
      estimate: [350, 660],
    },
  );
  return [...numbered, long];
};

/** The demo clock's fixed "now" (map, section 3): Monday 26 Oct 2026, 10:00 in Warsaw. */
export const demoNow = new Date("2026-10-26T10:00:00+01:00");
export const demoNowText = "Mon 26 Oct 2026, 10:00 CET";
