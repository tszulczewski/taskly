"use client";

import {
  Alert,
  QuickAdd,
  type SubmitResult,
  type TaskField,
  TaskList,
  type TaskFormValues,
  type TaskSubmit,
} from "@taskly/ui";
import { useLayoutEffect, useRef, useState } from "react";
import {
  hasTask,
  isNotFound,
  subtaskAdded,
  subtaskDeleted,
  submitError,
  TASK_SCREEN_TEXT,
  toCreateInput,
  toTaskItem,
  toUpdateInput,
  validateTaskForm,
} from "./task-items";
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from "./use-tasks";

/** A roll-up message in a task's row (spec E01, Roll-up messages). */
interface Notice {
  taskId: string;
  text: string;
}

/**
 * The task screen of the default list (spec E01, UI/UX), under the page heading: quick add above
 * the list, and "Add subtask" in each task. An add shows at once (a pending row); an edit and a
 * delete wait for the server. A subtask change can change its task's estimate (the sum of its
 * subtasks), which the server's answer brings.
 */
export function TaskListScreen({ listId }: { listId: string }) {
  const tasks = useTasks(listId);
  const createTask = useCreateTask(listId);
  const updateTask = useUpdateTask(listId);
  const deleteTask = useDeleteTask(listId);
  const [highlightId, setHighlightId] = useState<string>();
  // A task whose edit (or whose new subtask) got 404: once the refetch has removed its row, the
  // message stays here.
  const [goneId, setGoneId] = useState<string | null>(null);
  // Lasts until the next change, like the message above.
  const [notice, setNotice] = useState<Notice | null>(null);
  // A refetch of a list that never loaded goes back to "pending"; the failure stays on screen,
  // with "Trying again…", until it answers.
  const [retrying, setRetrying] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);
  const views = tasks.data ?? [];
  const goneShown = goneId !== null && !hasTask(views, goneId);

  // With Cache Components a page the user left is hidden (React Activity), not unmounted; it comes
  // back without the last add's highlight or an old message.
  useLayoutEffect(
    () => () => {
      setHighlightId(undefined);
      setGoneId(null);
      setNotice(null);
    },
    [],
  );

  // An empty list on the first load puts focus in quick add (spec E01, States), unless the user
  // has already moved it somewhere.
  useLayoutEffect(() => {
    if (tasks.data === undefined || !firstLoad.current) return;
    firstLoad.current = false;
    if (tasks.data.length > 0 || document.activeElement !== document.body) return;
    rootRef.current
      ?.querySelector<HTMLInputElement>('[data-slot="quick-add"] input[name="title"]')
      ?.focus();
  }, [tasks.data]);

  // The edited row is gone with its form, so focus goes to the list, or to the empty state after
  // the last task (spec E01, 404 on an edit; decision O4). Both are TaskList's focusable root.
  useLayoutEffect(() => {
    if (goneShown) listRef.current?.querySelector<HTMLElement>(':scope > [tabindex="-1"]')?.focus();
  }, [goneShown]);

  const retry = () => {
    setRetrying(true);
    void tasks.refetch().then(() => setRetrying(false));
  };

  const startChange = () => {
    setGoneId(null);
    setNotice(null);
  };

  const add: TaskSubmit = async (values) => {
    startChange();
    const input = toCreateInput(values);
    try {
      const task = await createTask.mutateAsync(input);
      setHighlightId(task.id);
      return { ok: true };
    } catch (error) {
      return submitError(error, values, TASK_SCREEN_TEXT.addFailed);
    }
  };

  const addSubtask = async (
    parentId: string,
    values: TaskFormValues,
  ): Promise<SubmitResult<TaskField>> => {
    startChange();
    // The list as it is before the temporary subtask goes in: whether the parent had subtasks.
    const before = views;
    const input = toCreateInput(values, parentId);
    try {
      const parent = await createTask.mutateAsync(input);
      const added = subtaskAdded(before, parent);
      setHighlightId(added.id);
      if (added.notice !== undefined) setNotice({ taskId: parent.id, text: added.notice });
      return { ok: true };
    } catch (error) {
      if (!isNotFound(error)) return submitError(error, values, TASK_SCREEN_TEXT.addFailed);
      setGoneId(parentId);
      return { ok: false, formError: TASK_SCREEN_TEXT.deleted };
    }
  };

  const edit = async (id: string, values: TaskFormValues): Promise<SubmitResult<TaskField>> => {
    startChange();
    const input = toUpdateInput(views, id, values);
    if (input === null) return { ok: true };
    try {
      await updateTask.mutateAsync({ id, input });
      return { ok: true };
    } catch (error) {
      if (!isNotFound(error)) return submitError(error, values, TASK_SCREEN_TEXT.saveFailed);
      setGoneId(id);
      return { ok: false, formError: TASK_SCREEN_TEXT.deleted };
    }
  };

  // A 404 means the task is already gone (deleted elsewhere, or no access): the dialog closes as
  // after a delete, and the refetch removes the row.
  const remove = (id: string) => {
    startChange();
    return deleteTask.mutateAsync(id).then(
      (parent) => {
        const text = subtaskDeleted(parent);
        if (parent !== null && text !== undefined) setNotice({ taskId: parent.id, text });
        return true;
      },
      (error: unknown) => isNotFound(error),
    );
  };

  return (
    <div
      ref={rootRef}
      data-slot="task-list-screen"
      data-list-id={listId}
      className="flex flex-col gap-between-groups"
    >
      <QuickAdd validate={validateTaskForm} onSubmit={add} />
      {goneShown ? <Alert title={TASK_SCREEN_TEXT.deleted} /> : null}
      <div ref={listRef}>
        <TaskList
          status={tasks.data ? "ready" : tasks.isError || retrying ? "error" : "loading"}
          tasks={views.map((view) => ({
            ...toTaskItem(view),
            ...(notice?.taskId === view.id && { notice: notice.text }),
          }))}
          onRetry={retry}
          retrying={retrying}
          validate={validateTaskForm}
          onEdit={edit}
          onAddSubtask={addSubtask}
          onDelete={remove}
          highlightId={highlightId}
        />
      </div>
    </div>
  );
}
