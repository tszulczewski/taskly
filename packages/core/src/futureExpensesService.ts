import "server-only";
import { futureExpenses } from "./futureExpenses";
import type { FutureExpenses } from "./schemas";
import { listTasks } from "./tasks";
import type { Db } from "./types";

/**
 * Future expenses of a list (spec E03, #21), for any member (`read`, through `listTasks`): the
 * total is built from the same views as the task rows, so a row's estimate and the total agree.
 * A non-member or an unknown list gets `NotFoundError("List")`.
 */
export async function futureExpensesService(
  db: Db,
  userId: string,
  listId: string,
): Promise<FutureExpenses> {
  return futureExpenses(await listTasks(db, userId, listId));
}
