"use client";

import {
  Alert,
  type EstimateField,
  type EstimateValues,
  FutureExpenses,
  QuickAdd,
  type SubmitResult,
  type TaskEdit,
  type TaskField,
  TaskList,
  type TaskFormValues,
  type TaskItem,
  type TaskSubmit,
} from "@taskly/ui";
import { useLayoutEffect, useRef, useState } from "react";
import { TASK_COMPLETED_MESSAGE } from "@taskly/core";
import { ApiError } from "../../lib/api-client";
import {
  addEstimateError,
  hasTask,
  isNotFound,
  subtaskAdded,
  subtaskDeleted,
  submitError,
  TASK_SCREEN_TEXT,
  titleOf,
  toCreateInput,
  toEstimate,
  toTaskItem,
  toUpdateInput,
  validateEstimate,
  validateTaskForm,
} from "./task-items";
import {
  type SetCompletedVariables,
  useAddEstimate,
  useCreateTask,
  useDeleteTask,
  useFutureExpenses,
  useSetCompleted,
  useTaskViews,
  useUpdateTask,
} from "./use-tasks";

/** A message in a row: a roll-up note (spec E01) or why a change went back (spec E03). */
interface RowText {
  taskId: string;
  text: string;
}

/** A 409 because the task was completed meanwhile (spec E03, Q3). */
const isTaskCompleted = (error: unknown) =>
  error instanceof ApiError && error.status === 409 && error.message === TASK_COMPLETED_MESSAGE;

/**
 * The task screen of the default list (spec E01, UI/UX), under the page heading: future expenses
 * (spec E03, decision I1), then quick add above the list, and "Add subtask" in each task. An add and a completion show at once (a pending row; a
 * replayed toggle); an edit and a delete wait for the server. A subtask change can change its
 * task's estimate (the sum of its subtasks), which the server's answer brings.
 */
export function TaskListScreen({ listId }: { listId: string }) {
  const { query: tasks, views: shown } = useTaskViews(listId);
  const expenses = useFutureExpenses(listId);
  const createTask = useCreateTask(listId);
  const updateTask = useUpdateTask(listId);
  const deleteTask = useDeleteTask(listId);
  const saveEstimate = useAddEstimate(listId);
  const [highlightId, setHighlightId] = useState<string>();
  // A task whose edit (or whose new subtask) got 404: once the refetch has removed its row, the
  // message stays here.
  const [goneId, setGoneId] = useState<string | null>(null);
  // Last until the next change, like the message above: a roll-up note in a task's row, and why a
  // completion or reopen went back, in its row (spec E03, s04.28).
  const [notice, setNotice] = useState<RowText | null>(null);
  const [rowError, setRowError] = useState<RowText | null>(null);
  // An "Add estimate" refused with 409 (the item got subtasks elsewhere): its form goes with the
  // refetch, so the server's message stays here until the next change.
  const [estimateRefused, setEstimateRefused] = useState<RowText | null>(null);
  // Hook-level, so it runs for every toggle, not only the last one (lesson 2026-10-30). A 404: the
  // row is gone (deleted elsewhere), and the refetch removes it.
  const setCompleted = useSetCompleted(listId, {
    onError: (error, { id, title }: SetCompletedVariables) => {
      if (isNotFound(error)) setGoneId(id);
      else setRowError({ taskId: id, text: TASK_SCREEN_TEXT.changeFailed(title) });
    },
  });
  // A refetch of a list that never loaded goes back to "pending"; the failure stays on screen,
  // with "Trying again…", until it answers.
  const [retrying, setRetrying] = useState(false);
  const [expensesRetrying, setExpensesRetrying] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);
  const views = shown ?? [];
  const refusedShown =
    estimateRefused !== null &&
    !(expenses.data?.unestimated ?? []).some((item) => item.id === estimateRefused.taskId);
  const goneShown = goneId !== null && !hasTask(views, goneId);

  // With Cache Components a page the user left is hidden (React Activity), not unmounted; it comes
  // back without the last add's highlight or an old message.
  useLayoutEffect(
    () => () => {
      setHighlightId(undefined);
      setGoneId(null);
      setNotice(null);
      setRowError(null);
      setEstimateRefused(null);
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

  const retryExpenses = () => {
    setExpensesRetrying(true);
    void expenses.refetch().then(() => setExpensesRetrying(false));
  };

  const startChange = () => {
    setGoneId(null);
    setNotice(null);
    setRowError(null);
    setEstimateRefused(null);
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
      // The refetch shows the task completed, which closes this form; the row keeps the reason.
      if (isTaskCompleted(error)) {
        const text = TASK_SCREEN_TEXT.addToCompleted(input.title, titleOf(before, parentId));
        setNotice({ taskId: parentId, text });
      }
      if (!isNotFound(error)) return submitError(error, values, TASK_SCREEN_TEXT.addFailed);
      setGoneId(parentId);
      return { ok: false, formError: TASK_SCREEN_TEXT.deleted };
    }
  };

  const edit: TaskEdit = async (id, values, opened) => {
    startChange();
    const input = toUpdateInput(views, id, values, opened);
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

  // "Add estimate" under future expenses (#47). Any outcome refetches the list and the total; a
  // 404 leaves the deleted notice, since the item and its form go with the refetch.
  const addEstimate = async (
    id: string,
    values: EstimateValues,
  ): Promise<SubmitResult<EstimateField>> => {
    startChange();
    try {
      await saveEstimate(id, toEstimate(values));
      return { ok: true };
    } catch (error) {
      if (isNotFound(error)) setGoneId(id);
      if (error instanceof ApiError && error.status === 409) {
        setEstimateRefused({ taskId: id, text: error.message });
      }
      return addEstimateError(error, values);
    }
  };

  const toggleComplete = (id: string, completed: boolean) => {
    startChange();
    // The confirmation can outlive its task when a background refetch removes the row.
    if (!hasTask(views, id)) {
      setGoneId(id);
      return;
    }
    setCompleted.mutate({ id, completed, title: titleOf(views, id) });
  };

  /** A row's item, with the message it currently has. */
  const withText = (item: TaskItem): TaskItem => ({
    ...item,
    ...(notice?.taskId === item.id && { notice: notice.text }),
    ...(rowError?.taskId === item.id && { error: rowError.text }),
    ...(item.subtasks && { subtasks: item.subtasks.map(withText) }),
  });

  return (
    <div
      ref={rootRef}
      data-slot="task-list-screen"
      data-list-id={listId}
      className="flex flex-col gap-between-groups"
    >
      {/* A refetch keeps the last total on screen, but a failed one shows the error: an outdated
          total never looks current. Loading shows only before the first answer. */}
      <FutureExpenses
        status={
          expenses.isError || expensesRetrying
            ? "error"
            : expenses.data !== undefined
              ? "ready"
              : "loading"
        }
        total={expenses.data?.total ?? null}
        unestimated={expenses.data?.unestimated ?? []}
        onRetry={retryExpenses}
        retrying={expensesRetrying}
        validate={validateEstimate}
        onAddEstimate={addEstimate}
      />
      <QuickAdd validate={validateTaskForm} onSubmit={add} />
      {goneShown ? <Alert title={TASK_SCREEN_TEXT.deleted} /> : null}
      {refusedShown ? <Alert title={estimateRefused.text} /> : null}
      <div ref={listRef}>
        <TaskList
          status={tasks.data ? "ready" : tasks.isError || retrying ? "error" : "loading"}
          tasks={views.map((view) => withText(toTaskItem(view)))}
          onRetry={retry}
          retrying={retrying}
          validate={validateTaskForm}
          onEdit={edit}
          onAddSubtask={addSubtask}
          onDelete={remove}
          onToggleComplete={toggleComplete}
          highlightId={highlightId}
        />
      </div>
    </div>
  );
}
