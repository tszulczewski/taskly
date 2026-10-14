/** All TanStack Query keys live here; never write inline key arrays. */
export const queryKeys = {
  lists: () => ["lists"] as const,
  tasks: (listId: string) => ["lists", listId, "tasks"] as const,
  shopping: (listId: string) => ["lists", listId, "shopping"] as const,
  summary: (listId?: string) =>
    listId ? (["lists", listId, "summary"] as const) : (["summary"] as const),
};
