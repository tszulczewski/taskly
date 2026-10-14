import { NotImplementedError } from "./errors";
import type { Db } from "./types";

// TODO: owner-created invitations (editor/viewer); accepting requires a matching email.
export async function createInvitation(
  _db: Db,
  _userId: string,
  _listId: string,
  _input: { email: string; role: "editor" | "viewer" },
): Promise<unknown> {
  throw new NotImplementedError("createInvitation");
}
export async function acceptInvitation(
  _db: Db,
  _user: { id: string; email: string },
  _token: string,
): Promise<{ listId: string }> {
  throw new NotImplementedError("acceptInvitation");
}
export async function removeMember(
  _db: Db,
  _userId: string,
  _listId: string,
  _memberUserId: string,
): Promise<void> {
  throw new NotImplementedError("removeMember");
}
