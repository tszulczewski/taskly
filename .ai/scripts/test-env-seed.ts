// Sample renovation tasks in the QA demo user's default list in the running test env.
// Run: sh .ai/scripts/test-env-seed.sh (loads the gitignored env file; never prints its values).
import { eq } from "drizzle-orm";
import {
  ensureDefaultList,
  createTask,
  listPlaces,
  listTasks,
  setTaskCompleted,
  updateTask,
} from "@taskly/core/server";
import { getDb, schema } from "@taskly/db";

type Sub = { title: string; zl?: [number, number]; places?: string[]; done?: boolean };
type Task = Sub & { description?: string; important?: boolean; urgent?: boolean; subtasks?: Sub[] };

const PLAN: Record<string, Task[]> = {
  Łazienka: [
    {
      title: "Skucie starych płytek",
      zl: [800, 1200],
      places: ["Łazienka"],
      done: true,
    },
    {
      title: "Hydraulika",
      description: "Przeniesienie podejść pod umywalkę i prysznic walk-in.",
      important: true,
      urgent: true,
      subtasks: [
        { title: "Nowe podejścia wody", zl: [1500, 2200], places: ["Łazienka"] },
        { title: "Odpływ liniowy", zl: [900, 1400], places: ["Łazienka"] },
        { title: "Wymiana pionu", zl: [1200, 2500], done: true },
      ],
    },
    {
      title: "Hydroizolacja",
      zl: [600, 900],
      places: ["Łazienka"],
      important: true,
    },
    {
      title: "Płytki",
      subtasks: [
        { title: "Zakup płytek 60×120", zl: [2400, 3600] },
        { title: "Układanie płytek", zl: [3000, 4500], places: ["Łazienka"] },
        { title: "Fugowanie i silikon", zl: [400, 600] },
      ],
    },
    { title: "Montaż ceramiki i armatury", zl: [1000, 1500] },
    { title: "Lustro z podświetleniem" },
  ],
  Kuchnia: [
    {
      title: "Projekt zabudowy",
      zl: [500, 500],
      done: true,
    },
    {
      title: "Elektryka",
      urgent: true,
      subtasks: [
        { title: "Gniazda nad blatem", zl: [400, 700], places: ["Kuchnia"] },
        { title: "Obwód pod płytę indukcyjną", zl: [300, 500], places: ["Kuchnia"] },
      ],
    },
    {
      title: "Meble kuchenne",
      description: "Fronty lakierowane, blat kwarcowy.",
      zl: [18000, 26000],
      important: true,
    },
    { title: "Malowanie ścian", zl: [700, 1100], places: ["Kuchnia", "Salon"] },
    { title: "Okap — wybór modelu" },
  ],
  Sypialnia: [
    {
      title: "Gładzie i malowanie",
      subtasks: [
        { title: "Gładź gipsowa", zl: [1200, 1800], places: ["Sypialnia"] },
        { title: "Malowanie dwukrotne", zl: [600, 900], places: ["Sypialnia"] },
      ],
    },
    { title: "Panele podłogowe", zl: [2500, 3800], places: ["Sypialnia"] },
    { title: "Szafa wnękowa", zl: [4000, 6500], important: true },
    { title: "Listwy przypodłogowe", zl: [300, 450], done: true },
  ],
};

const grosze = (zl?: [number, number]) =>
  zl ? { minGrosze: zl[0] * 100, maxGrosze: zl[1] * 100 } : null;

async function main(): Promise<void> {
  const email = process.env.DEMO_EMAIL;
  if (!email) throw new Error("DEMO_EMAIL is not set");
  const db = getDb();
  const [user] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, email));
  if (!user) throw new Error(`no user ${email}`);
  // The app shows only the default list for now, so everything goes there; the room becomes the
  // task's place.
  const listId = await ensureDefaultList(db, user.id);
  if ((await listTasks(db, user.id, listId)).length > 0) {
    console.warn("skip: the default list already has tasks");
    return;
  }
  const placeIds = new Map((await listPlaces(db, user.id)).map((p) => [p.name, p.id]));
  const ids = (names: string[]) =>
    names.map((n) => placeIds.get(n)).filter((id) => id !== undefined);

  let tasks = 0;
  for (const [room, plan] of Object.entries(PLAN)) {
    for (const t of plan) {
      const view = await createTask(db, user.id, listId, {
        title: t.title,
        description: t.description ?? null,
        estimate: t.subtasks ? null : grosze(t.zl),
        placeIds: ids(t.places ?? [room]),
      });
      tasks++;
      for (const s of t.subtasks ?? []) {
        const parent = await createTask(db, user.id, listId, {
          title: s.title,
          estimate: grosze(s.zl),
          parentId: view.id,
          placeIds: ids(s.places ?? []),
        });
        tasks++;
        if (s.done) {
          const sub = parent.subtasks.find((x) => x.title === s.title)!;
          await setTaskCompleted(db, user.id, sub.id, { completed: true });
        }
      }
      if (t.important || t.urgent) {
        await updateTask(db, user.id, view.id, {
          important: t.important ?? false,
          urgent: t.urgent ?? false,
        });
      }
      if (t.done) await setTaskCompleted(db, user.id, view.id, { completed: true });
    }
    console.warn(`seeded ${room} (${plan.length} tasks)`);
  }
  console.warn(`done: ${tasks} tasks and subtasks for ${email}`);
}

main().then(
  () => process.exit(0),
  (e: unknown) => {
    console.error("seed failed:", e instanceof Error ? e.message : "error");
    process.exit(1);
  },
);
