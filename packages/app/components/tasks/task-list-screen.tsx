"use client";

/**
 * The task screen of the default list (spec E01, UI/UX), under the page heading. The page passes
 * only the list id; the screen loads the tasks itself.
 */
export function TaskListScreen({ listId }: { listId: string }) {
  return <div data-slot="task-list-screen" data-list-id={listId} />;
}
