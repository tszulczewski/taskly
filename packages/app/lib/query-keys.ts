/** All TanStack Query keys live here; never write inline key arrays. */
export const queryKeys = {
  lists: () => ["lists"] as const,
  tasks: (listId: string) => ["lists", listId, "tasks"] as const,
  /**
   * Mutation keys of the task changes the screen shows before the server confirms them, replayed
   * over the server's data while pending (spec E03, UI/UX). Under `tasks`, so the list's
   * `isMutating` counts them too.
   */
  taskChanges: (listId: string) => ["lists", listId, "tasks", "change"] as const,
  taskChange: (listId: string, kind: "completion") =>
    ["lists", listId, "tasks", "change", kind] as const,
  shopping: (listId: string) => ["lists", listId, "shopping"] as const,
  /** Not under `tasks`: it holds no optimistic state, so no task mutation's rule skips it. */
  futureExpenses: (listId: string) => ["lists", listId, "future-expenses"] as const,
};
