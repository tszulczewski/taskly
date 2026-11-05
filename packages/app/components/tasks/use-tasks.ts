"use client";

import {
  type CreateTaskInput,
  deleteTaskResponseSchema,
  futureExpensesResponseSchema,
  type SubtaskView,
  taskListResponseSchema,
  type TaskView,
  taskViewSchema,
  type UpdateTaskInput,
} from "@taskly/core";
import {
  type Mutation,
  type QueryClient,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { apiCall } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import {
  isPendingTaskId,
  PENDING_PREFIX,
  type PendingChange,
  replayChanges,
  totalText,
} from "./task-items";

let pendingCount = 0;

/**
 * One queue for every task mutation of a list (spec E03 and E02, Order of requests): a request is
 * sent only after the previous one settled, so answers reach the cache in the order the changes
 * were made, and an earlier change's tree never replaces one a later change confirmed.
 */
const listQueue = (listId: string) => ({ id: `tasks:${listId}` });

const tasksPath = (listId: string) => `/api/lists/${encodeURIComponent(listId)}/tasks`;

function refusePending(taskId: string): void {
  if (isPendingTaskId(taskId)) throw new Error("The task is not saved yet");
}

function taskPath(taskId: string): string {
  refusePending(taskId);
  return `/api/tasks/${encodeURIComponent(taskId)}`;
}

/**
 * Puts the server's row where the row `slotId` (or an older copy of the same task) is, dropping
 * any second copy; appends it when neither is cached. Subtasks of that row still pending (other
 * adds in flight) stay under it, except `settledId`, the one this answer confirms.
 */
function putTask(tasks: TaskView[], view: TaskView, slotId: string, settledId?: string) {
  const isSlot = (task: TaskView) => task.id === slotId || task.id === view.id;
  const slot = tasks.find(isSlot);
  if (slot === undefined) return [...tasks, view];
  const pending = slot.subtasks.filter(
    (subtask) => isPendingTaskId(subtask.id) && subtask.id !== settledId,
  );
  const next = pending.length === 0 ? view : { ...view, subtasks: [...view.subtasks, ...pending] };
  return tasks.flatMap((task) => (task === slot ? [next] : isSlot(task) ? [] : [task]));
}

/** The list without the row or subtask `id`. */
function withoutTask(tasks: TaskView[], id: string): TaskView[] {
  return tasks.flatMap((task) => {
    if (task.id === id) return [];
    if (!task.subtasks.some((subtask) => subtask.id === id)) return [task];
    return [{ ...task, subtasks: task.subtasks.filter((subtask) => subtask.id !== id) }];
  });
}

async function writeTasks(
  queryClient: QueryClient,
  listId: string,
  update: (tasks: TaskView[]) => TaskView[],
): Promise<void> {
  const queryKey = queryKeys.tasks(listId);
  // A refetch that started before the server committed would overwrite the result with old data.
  await queryClient.cancelQueries({ queryKey });
  // A list that never loaded stays unloaded; the refetch on settle loads it.
  queryClient.setQueryData<TaskView[]>(queryKey, (tasks) => tasks && update(tasks));
}

function settle(queryClient: QueryClient, listId: string): void {
  // The total holds no optimistic state, so it follows every settled change, even while others run.
  void queryClient.invalidateQueries({ queryKey: queryKeys.futureExpenses(listId) });
  const key = queryKeys.tasks(listId);
  // While another task mutation of this list is running, its refetch would drop that mutation's
  // pending row; the last one to settle refetches for all of them.
  if (queryClient.isMutating({ mutationKey: key }) > 1) return;
  void queryClient.invalidateQueries({ queryKey: key });
}

/** The tasks of a list, top-level in order, each with its subtasks (`GET …/tasks`). */
export function useTasks(listId: string) {
  return useQuery({
    queryKey: queryKeys.tasks(listId),
    queryFn: ({ signal }) =>
      apiCall(tasksPath(listId), { signal, response: taskListResponseSchema }),
  });
}

/**
 * The list's future expenses as `FutureExpenses` shows them (`GET …/future-expenses`): the
 * server's total formatted at the edge, null for "No estimates yet". The total is never computed
 * on the client (standards §6); every settled task mutation refetches it.
 */
export function useFutureExpenses(listId: string) {
  return useQuery({
    queryKey: queryKeys.futureExpenses(listId),
    queryFn: ({ signal }) =>
      apiCall(`/api/lists/${encodeURIComponent(listId)}/future-expenses`, {
        signal,
        response: futureExpensesResponseSchema,
      }),
    select: totalText,
  });
}

/** What `useCreateTask` keeps between `onMutate` and the server's answer. */
export interface CreateTaskContext {
  /** The temporary row's or subtask's id (`isPendingTaskId`). */
  tempId: string;
}

/** The list with a temporary row at its end, or a temporary subtask at the end of its parent's. */
function withTemporary(tasks: TaskView[], parentId: string | null, temporary: SubtaskView) {
  if (parentId === null) {
    return [...tasks, { ...temporary, unestimatedSubtasks: 0, subtasks: [] }];
  }
  // The parent's estimate and count stay as they are until the server's parent arrives.
  return tasks.map((task) =>
    task.id === parentId ? { ...task, subtasks: [...task.subtasks, temporary] } : task,
  );
}

/**
 * Adds a task, or with `parentId` a subtask (optimistic): a pending row is appended at once (a
 * subtask at the end of its parent's subtasks), then replaced by the server's answer, or removed
 * if the add fails. `mutateAsync` resolves with the server's `TaskView`: the new task, or for a
 * subtask its parent with all its subtasks. Errors are `ApiError` (409: show `message`; 404 on a
 * subtask: the parent is gone) or the network error.
 */
export function useCreateTask(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: queryKeys.tasks(listId),
    scope: listQueue(listId),
    mutationFn: async (input: CreateTaskInput) => {
      if (input.parentId !== null) refusePending(input.parentId);
      return apiCall(tasksPath(listId), { method: "POST", body: input, response: taskViewSchema });
    },
    onMutate: async (input): Promise<CreateTaskContext> => {
      const queryKey = queryKeys.tasks(listId);
      await queryClient.cancelQueries({ queryKey });
      pendingCount += 1;
      const tempId = `${PENDING_PREFIX}${pendingCount}`;
      const temporary: SubtaskView = {
        id: tempId,
        title: input.title,
        description: input.description,
        estimate: input.estimate,
        completed: false,
        // Unknown until the server answers; pending rows are never sent or completed.
        position: "",
      };
      queryClient.setQueryData<TaskView[]>(
        queryKey,
        (tasks) => tasks && withTemporary(tasks, input.parentId, temporary),
      );
      return { tempId };
    },
    // For a subtask the server returns its parent, which replaces the parent's row.
    onSuccess: (task, input, { tempId }) =>
      writeTasks(queryClient, listId, (tasks) =>
        putTask(tasks, task, input.parentId ?? tempId, tempId),
      ),
    // Only this add's own row goes: a snapshot would also drop other adds still in flight.
    onError: (_error, _input, context) => {
      queryClient.setQueryData<TaskView[]>(
        queryKeys.tasks(listId),
        (tasks) => tasks && context && withoutTask(tasks, context.tempId),
      );
    },
    onSettled: () => settle(queryClient, listId),
  });
}

export interface UpdateTaskVariables {
  id: string;
  /** Only the changed fields (`updateTaskInput`). */
  input: UpdateTaskInput;
}

/**
 * Saves an edit. Not optimistic: the row changes only when the server's `TaskView` arrives (for a
 * subtask that is its parent, which replaces the parent's row). Every outcome refetches
 * the list, so after a 404 the deleted row disappears and after a 409 the row shows the server's
 * state.
 */
export function useUpdateTask(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: queryKeys.tasks(listId),
    scope: listQueue(listId),
    mutationFn: async ({ id, input }: UpdateTaskVariables) =>
      apiCall(taskPath(id), { method: "PATCH", body: input, response: taskViewSchema }),
    onSuccess: (task, { id }) =>
      writeTasks(queryClient, listId, (tasks) => putTask(tasks, task, id)),
    onSettled: () => settle(queryClient, listId),
  });
}

/**
 * Deletes a task by id. Not optimistic: the row goes when the server answers `null`; a parent
 * `TaskView` (a deleted subtask) replaces the parent's row. Every outcome refetches.
 */
export function useDeleteTask(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: queryKeys.tasks(listId),
    scope: listQueue(listId),
    mutationFn: async (id: string) =>
      apiCall(taskPath(id), { method: "DELETE", response: deleteTaskResponseSchema }),
    onSuccess: (parent, id) =>
      writeTasks(queryClient, listId, (tasks) =>
        parent === null ? tasks.filter((task) => task.id !== id) : putTask(tasks, parent, id),
      ),
    onSettled: () => settle(queryClient, listId),
  });
}

export interface SetCompletedVariables {
  id: string;
  completed: boolean;
  /** For the row message if the server refuses it. */
  title: string;
}

/**
 * Completes or reopens a task or subtask (`PUT …/completion`). Optimistic without touching the
 * cache: the screen shows the pending variables replayed over the server's data
 * (`useTaskViews`), so a failure needs no rollback and a newer toggle is never overwritten by an
 * older answer. The answer, the task that holds the row, replaces that task in the cache before
 * the mutation stops being pending, so the screen never shows a gap. `onError` is a hook-level
 * option: per-call callbacks fire only for the last call (lesson 2026-10-30).
 */
export function useSetCompleted(
  listId: string,
  { onError }: { onError?: (error: unknown, variables: SetCompletedVariables) => void } = {},
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: queryKeys.taskChange(listId, "completion"),
    scope: listQueue(listId),
    mutationFn: async ({ id, completed }: SetCompletedVariables) =>
      apiCall(`${taskPath(id)}/completion`, {
        method: "PUT",
        body: { completed },
        response: taskViewSchema,
      }),
    onSuccess: (task) => writeTasks(queryClient, listId, (tasks) => putTask(tasks, task, task.id)),
    onError: (error, variables) => onError?.(error, variables),
    onSettled: () => settle(queryClient, listId),
  });
}

/** A pending change mutation as the replay reads it; the last key part names its kind. */
function toChange(mutation: Mutation<unknown, unknown, unknown>): PendingChange {
  const kind = mutation.options.mutationKey!.at(-1) as PendingChange["kind"];
  return { kind, ...(mutation.state.variables as Omit<PendingChange, "kind">) } as PendingChange;
}

/**
 * The tasks of a list as the screen shows them: the cached server data in read order, with the
 * pending changes (completions) applied in submission order (spec E03, UI/UX). `views` is
 * undefined until the list has loaded.
 */
export function useTaskViews(listId: string) {
  const query = useTasks(listId);
  const changes = useMutationState({
    filters: { mutationKey: queryKeys.taskChanges(listId), status: "pending" },
    select: toChange,
  });
  const views = useMemo(
    () => (query.data === undefined ? undefined : replayChanges(query.data, changes)),
    [query.data, changes],
  );
  return { query, views };
}
