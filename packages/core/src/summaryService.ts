import { NotImplementedError } from "./errors";
import type { summarize } from "./summary";
import type { Db } from "./types";

type Summary = ReturnType<typeof summarize>;

// TODO: spent vs. upcoming (AI estimate); count leaf tasks only to avoid double counting.
export async function listSummary(_db: Db, _userId: string, _listId: string): Promise<Summary> {
  throw new NotImplementedError("listSummary");
}
export async function globalSummary(_db: Db, _userId: string): Promise<Summary> {
  throw new NotImplementedError("globalSummary");
}
