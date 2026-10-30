import "server-only";
import { DEFAULT_LIST_NAME } from "@taskly/core";
import { openDefaultList } from "../../lib/default-list";
import { requireSessionUser } from "../../lib/session";
import { AppShell } from "../shell/app-shell";
import { TaskListScreen } from "./task-list-screen";
import { TaskPageFailed } from "./task-page-failed";

/**
 * The body of `/`; render it inside `<Suspense>`. A visitor without a session is sent to
 * `/sign-in` before the default list is opened, so nothing behind the guard runs for them.
 */
export async function TaskPage() {
  const user = await requireSessionUser();
  const listId = await openDefaultList(user.id);
  return (
    <AppShell>
      <div className="flex flex-col gap-between-groups">
        {/* The default list's name: no screen renames it yet, so it is known without the list. */}
        <h1 className="text-heading font-strong">{DEFAULT_LIST_NAME}</h1>
        {listId === null ? <TaskPageFailed /> : <TaskListScreen listId={listId} />}
      </div>
    </AppShell>
  );
}
