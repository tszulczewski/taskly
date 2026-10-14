import type { Role } from "./schemas";

const rank: Record<Role, number> = { viewer: 0, editor: 1, owner: 2 };

export type Action = "read" | "write" | "manage";
const required: Record<Action, Role> = { read: "viewer", write: "editor", manage: "owner" };

/** Tasks inherit the role of their list, so callers pass the list role. */
export function can(role: Role | null | undefined, action: Action): boolean {
  return role != null && rank[role] >= rank[required[action]];
}
