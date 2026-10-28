import { useEffect, useRef, useState } from "react";
import {
  AppShell,
  ErrorState,
  QuickAdd,
  TaskList,
  type MovePosition,
  type SubmitResult,
  type TaskField,
  type TaskFormValues,
  type TaskItem,
} from "@taskly/ui";
import {
  forDisplay,
  reorder,
  setCompleted,
} from "../../../../packages/ui/.storybook/blocks/TaskScreen";
import {
  fromValues,
  taskMessages,
  validateTask,
} from "../../../../packages/ui/.storybook/blocks/task-data";
import type { ScreenProps } from "../page-open";
import { runPreset } from "../presets";
import { slowMs, type Scenarios } from "../scenarios";
import { navigate, type ScreenId } from "../screens";
import { callApi, change, wait } from "../server";
import { useDemo } from "../store";
import { Gate } from "./gate";

const mapTasks = (tasks: TaskItem[], change: (task: TaskItem) => TaskItem | null): TaskItem[] =>
  tasks.flatMap((item) => {
    const changed = change(item);
    if (!changed) return [];
    return [
      changed.subtasks ? { ...changed, subtasks: mapTasks(changed.subtasks, change) } : changed,
    ];
  });

const without = (id: string) => (list: TaskItem[]) =>
  mapTasks(list, (item) => (item.id === id ? null : item));

/** What the server stores: rows still waiting for an answer are not part of it. */
const stored = (list: TaskItem[]) => mapTasks(list, (item) => (item.pending ? null : item));

const titleOf = (list: TaskItem[], id: string): string => {
  for (const item of list) {
    if (item.id === id) return item.title;
    const inner = titleOf(item.subtasks ?? [], id);
    if (inner !== "") return inner;
  }
  return "";
};

let nextTask = 0;

/** The empty state's wording decided in the screen map (L22); the design system's default differs. */
const emptyText = { emptyBody: "Start with one task. Only the title is required." };

/** s06.8 / s07.6 (L15; tasks spec, UI/UX). How long the row stays is the prototype's choice. */
const goneText = "This task was deleted. The list has been refreshed.";
const goneMs = 3000;

/** s04.12: the server's 409 message, which the form shows as it is (tasks spec, UI/UX). */
const conflictText = "Please try again";

/** s04.21 (L13; tasks spec, UI/UX "Page did not open"). */
const pageErrorText = "Could not open your tasks.";

/**
 * - idle: not opened yet in this visit; shows the stored list, so the review page can be read.
 * - page: P12 slow, the page itself is not there yet (list skeleton, no quick add).
 * - pageFailed: s04.21.
 * - loading / error / ready: the list's own states (P05).
 */
type Phase = "idle" | "page" | "pageFailed" | "loading" | "error" | "ready";

/**
 * s04–s08: the task list in the app shell, wired the way spec E01 and the design system's
 * "Optimistic change" pattern describe: an add shows a pending row at once and is highlighted when
 * confirmed; an edit and a delete wait for the server in their form or dialog (L08). Moves and
 * completion (the owner's extension, s04.22–s04.29) change at once and roll back with a message in
 * the row. Every answer comes from the scenario controls (P04–P09, P12).
 */
export function TaskScreen({
  screenId,
  active,
  pageLoad,
  after,
  onAfterApplied,
}: {
  screenId: ScreenId;
  /** The state guide's scenarios for the next change, set once the list is shown. */
  after?: Partial<Scenarios>;
  onAfterApplied: () => void;
} & ScreenProps) {
  const demo = useDemo();
  const account = demo.owner;
  const accountId = account?.id ?? null;
  const [phase, setPhase] = useState<Phase>("idle");
  const [retrying, setRetrying] = useState(false);
  const [highlightId, setHighlightId] = useState<string>();
  const root = useRef<HTMLDivElement>(null);
  // The account this screen last saw; switching accounts opens the page again.
  const seen = useRef<string | null | undefined>(undefined);

  const setTasks = (change: (tasks: TaskItem[]) => TaskItem[]) => {
    if (accountId) demo.updateTasks(accountId, change);
  };

  const loadList = async (alive: () => boolean) => {
    const mode = demo.scenarios.load;
    if (mode !== "fast") setPhase("loading");
    try {
      await callApi(demo, mode === "fast" ? 0 : mode === "slow" ? slowMs : demo.scenarios.delay);
    } catch {
      return;
    }
    if (!alive()) return;
    if (mode === "fast" || mode === "slow") {
      setPhase("ready");
      return;
    }
    // "Fails once, then loads": the next try succeeds (s04.5 → s04.6).
    if (mode === "errorThenOk") demo.setScenario("load", "fast");
    // A bad response is treated like a failed load (s04.18 → s04.4).
    setPhase("error");
  };

  const openPage = async (alive: () => boolean) => {
    const page = demo.scenarios.page;
    // A fresh page shows only what the server stored.
    setTasks(stored);
    if (page !== "fast") {
      setPhase("page");
      await wait(page === "slow" ? slowMs : demo.scenarios.delay);
      if (!alive()) return;
    }
    if (page === "failed") {
      setPhase("pageFailed");
      return;
    }
    await loadList(alive);
  };

  useEffect(() => {
    const switched = seen.current !== undefined && seen.current !== accountId;
    seen.current = accountId;
    if (!active || accountId === null) return;
    let current = true;
    const alive = () => current;
    if (pageLoad || switched) void openPage(alive);
    else setPhase("ready");
    return () => {
      current = false;
    };
    // Only an arrival or an account switch opens the page; scenario changes wait for the next one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, accountId]);

  useEffect(() => {
    if (active && phase === "ready" && root.current) void runPreset(screenId, root.current);
  }, [active, phase, screenId]);

  useEffect(() => {
    if (!active || phase !== "ready" || !after) return;
    demo.setScenarios(after);
    onAfterApplied();
  }, [active, phase, after, demo, onAfterApplied]);

  const empty = (account?.tasks.length ?? 0) === 0;

  // s04.3: an empty list puts focus in the title. QuickAdd's autoFocus only acts on mount, and the
  // review engine focuses the page heading on arrival, so this runs after it. Only when the list is
  // shown: a list emptied by deleting its last task keeps focus on the empty state (s08.7, O4).
  useEffect(() => {
    if (!active || !empty || phase !== "ready") return;
    const frame = requestAnimationFrame(() =>
      root.current?.querySelector<HTMLInputElement>("main input")?.focus(),
    );
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, phase]);

  if (!account) {
    return (
      <Gate
        state="s04.1"
        title="Not signed in"
        actions={[
          { label: "Go to sign-in", onClick: () => navigate("s01") },
          { label: "Sign in as Marta (K2)", onClick: () => demo.switchAccount("K2") },
        ]}
      >
        A guest who opens / is sent to the sign-in page by the server, before any task data loads.
      </Gate>
    );
  }

  /** P09 applies once, to the first request it fits. */
  const takeRace = (kind: "deleted" | "conflict") => {
    if (demo.scenarios.race !== kind) return false;
    demo.setScenario("race", "none");
    return true;
  };

  /** 404: the message shows in the form, then the refetched list no longer has the task. */
  const gone = async (id: string): Promise<SubmitResult<TaskField>> => {
    try {
      await callApi(demo);
    } catch {
      return { ok: false };
    }
    window.setTimeout(() => {
      setTasks(without(id));
      // The form that had focus went with its row; focus goes to the list, never to the page.
      requestAnimationFrame(() => {
        if (document.activeElement === document.body)
          root.current?.querySelector<HTMLElement>('[data-slot="task-list"]')?.focus();
      });
    }, goneMs);
    return { ok: false, formError: goneText };
  };

  const add = async (
    parentId: string | null,
    values: TaskFormValues,
  ): Promise<SubmitResult<TaskField>> => {
    if (parentId !== null && takeRace("deleted")) return gone(parentId);
    const conflict = takeRace("conflict");
    nextTask += 1;
    const tempId = `temp-${nextTask}`;
    const pendingRow = { ...fromValues(tempId, values), pending: true };
    setTasks((list) =>
      parentId === null
        ? [...list, pendingRow]
        : mapTasks(list, (item) =>
            item.id === parentId
              ? { ...item, subtasks: [...(item.subtasks ?? []), pendingRow] }
              : item,
          ),
    );
    let confirmed: boolean;
    try {
      confirmed = (await change(demo)) && !conflict;
    } catch {
      setTasks(without(tempId));
      return { ok: false };
    }
    if (!confirmed) {
      // s04.11 with the design system's text (L14); s04.12 with the server's.
      setTasks(without(tempId));
      return { ok: false, formError: conflict ? conflictText : taskMessages.addFailed };
    }
    const id = `task-${nextTask}`;
    setTasks((list) =>
      mapTasks(list, (item) => (item.id === tempId ? fromValues(id, values) : item)),
    );
    setHighlightId(id);
    return { ok: true };
  };

  const edit = async (id: string, values: TaskFormValues): Promise<SubmitResult<TaskField>> => {
    if (takeRace("deleted")) return gone(id);
    try {
      if (!(await change(demo))) return { ok: false, formError: taskMessages.saveFailed };
    } catch {
      return { ok: false };
    }
    setTasks((list) =>
      mapTasks(list, (item) => (item.id === id ? fromValues(id, values, item) : item)),
    );
    return { ok: true };
  };

  const remove = async (id: string) => {
    try {
      const deleted = await change(demo);
      if (deleted) setTasks(without(id));
      return deleted;
    } catch {
      return false;
    }
  };

  /** Shows the change at once; a refusal puts the row back with a message in it. */
  const optimistic = async (
    id: string,
    apply: (list: TaskItem[]) => TaskItem[],
    message: (title: string) => string,
    conflict = false,
  ) => {
    const before = account.tasks;
    setTasks((list) => apply(mapTasks(list, (item) => ({ ...item, error: undefined }))));
    try {
      if ((await change(demo)) && !conflict) return;
    } catch {
      return;
    }
    const title = titleOf(before, id);
    setTasks(() =>
      mapTasks(before, (item) => (item.id === id ? { ...item, error: message(title) } : item)),
    );
  };

  const move = (id: string, position: MovePosition) =>
    void optimistic(
      id,
      (list) => reorder(list, id, position),
      taskMessages.moveFailed,
      takeRace("conflict"),
    );

  const toggleComplete = (id: string, completed: boolean) =>
    void optimistic(id, (list) => setCompleted(list, id, completed), taskMessages.changeFailed);

  // Signing out needs no valid session (Better Auth answers 200 either way), so P04 does not apply.
  const signOut = async () => {
    const answer = demo.scenarios.signOut;
    await wait(demo.scenarios.delay);
    if (answer === "failThenOk") demo.setScenario("signOut", "ok");
    if (answer !== "ok") return false;
    demo.signOut();
    navigate("s01");
    return true;
  };

  const retryList = async () => {
    const mode = demo.scenarios.load;
    setRetrying(true);
    try {
      await callApi(demo);
    } catch {
      return;
    }
    setRetrying(false);
    if (mode === "fast" || mode === "slow") setPhase("ready");
    else if (mode === "errorThenOk") demo.setScenario("load", "fast");
  };

  const retryPage = async () => {
    const page = demo.scenarios.page;
    setRetrying(true);
    await wait(demo.scenarios.delay);
    setRetrying(false);
    if (page !== "failed") await loadList(() => true);
  };

  const listStatus =
    phase === "page" || phase === "loading" ? "loading" : phase === "error" ? "error" : "ready";

  return (
    <div ref={root}>
      <AppShell theme={demo.theme} onThemeChange={demo.setTheme} onSignOut={signOut}>
        <div className="flex flex-col gap-between-groups">
          {/* The list's name is the page heading, not editable in version 1 (L21). It stays on
              s04.21 too (owner, 2026-10-27; tasks spec, UI/UX). */}
          <h1 className="text-heading font-strong">{account.listName}</h1>
          {phase === "pageFailed" ? (
            // No list and no quick add: nothing of the page arrived (L13).
            <ErrorState
              title={pageErrorText}
              onRetry={() => void retryPage()}
              retrying={retrying}
            />
          ) : (
            <>
              {phase === "page" ? null : (
                <QuickAdd
                  validate={validateTask}
                  onSubmit={(values) => add(null, values)}
                  text={emptyText}
                />
              )}
              <TaskList
                status={listStatus}
                // Completed tasks show last; the stored order does not change (decision 2026-10-21).
                tasks={forDisplay(account.tasks)}
                onRetry={() => void retryList()}
                retrying={retrying}
                validate={validateTask}
                onEdit={edit}
                onAddSubtask={(parentId, values) => add(parentId, values)}
                onDelete={remove}
                onMove={move}
                onToggleComplete={toggleComplete}
                highlightId={highlightId}
                text={emptyText}
              />
            </>
          )}
        </div>
      </AppShell>
    </div>
  );
}
