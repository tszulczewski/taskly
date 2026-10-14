export interface SummaryTask {
  status: "todo" | "done";
  costGrosze: number | null;
  estimateMinGrosze: number | null;
  estimateMaxGrosze: number | null;
}

/** Spent = real costs; upcoming = AI estimate range of tasks not yet done. */
export function summarize(tasks: SummaryTask[]) {
  let spent = 0;
  let upcomingMin = 0;
  let upcomingMax = 0;
  for (const t of tasks) {
    spent += t.costGrosze ?? 0;
    if (t.status === "todo") {
      upcomingMin += t.estimateMinGrosze ?? 0;
      upcomingMax += t.estimateMaxGrosze ?? 0;
    }
  }
  return { spentGrosze: spent, upcomingMinGrosze: upcomingMin, upcomingMaxGrosze: upcomingMax };
}
