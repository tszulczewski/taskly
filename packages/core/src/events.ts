import { NotImplementedError } from "./errors";

export type ListEvent = {
  listId: string;
  type: "task" | "shopping" | "members" | "list";
  at: number;
};

// TODO: single-process pub/sub feeding the SSE Route Handler.
export function publishListEvent(_listId: string, _type: ListEvent["type"]): void {
  throw new NotImplementedError("publishListEvent");
}

/** Returns an unsubscribe function. */
export function subscribeListEvents(_fn: (e: ListEvent) => void): () => void {
  throw new NotImplementedError("subscribeListEvents");
}
