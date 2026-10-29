"use client";

import {
  type CreateTaskInput,
  deleteTaskResponseSchema,
  taskListResponseSchema,
  type TaskView,
  taskViewSchema,
  type UpdateTaskInput,
} from "@taskly/core";
import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiCall } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";

// Server ids are UUIDs (`taskViewSchema`), so an id with this prefix can only be a temporary row.
const PENDING_PREFIX = "pending-";
let pendingCount = 0;

/**
 * True for a row the server has not confirmed yet (an optimistic add). The screen renders it as
 * pending (dimmed, actions disabled); the update and delete hooks refuse it, so no request is ever
 * sent with a temporary id (spec E01, Optimistic updates).
 */
export function isPendingTaskId(id: string): boolean {
  return id.startsWith(PENDING_PREFIX);
}

const tasksPath = (listId: string) => `/api/lists/${encodeURIComponent(listId)}/tasks`;

function taskPath(taskId: string): string {
  if (isPendingTaskId(taskId)) throw new Error("The task is not saved yet");
  return `/api/tasks/${encodeURIComponent(taskId)}`;
}

/**
 * Puts the server's row where the row `slotId` (or an older copy of the same task) is, dropping
 * any second copy; appends it when neither is cached.
 */
function putTask(tasks: TaskView[], view: TaskView, slotId: string): TaskView[] {
  const isSlot = (task: TaskView) => task.id === slotId || task.id === view.id;
  const at = tasks.findIndex(isSlot);
  if (at === -1) return [...tasks, view];
  return tasks.flatMap((task, index) => (index === at ? [view] : isSlot(task) ? [] : [task]));
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

/** What `useCreateTask` keeps between `onMutate` and the server's answer. */
export interface CreateTaskContext {
  /**
   * The list as cached before the temporary row was added (undefined when it had not loaded).
   * Phase 3's first-subtask message compares the parent in it with the server's parent.
   */
  previous: TaskView[] | undefined;
  /** The temporary row's id (`isPendingTaskId`). */
  tempId: string;
}

/**
 * Adds a task (optimistic): a pending row is appended at once, then replaced in place by the
 * server's `TaskView`, or removed if the add fails. `mutateAsync` resolves with that `TaskView`,
 * whose `id` is the new task's. Errors are `ApiError` (409: show `message`) or the network error.
 */
export function useCreateTask(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: queryKeys.tasks(listId),
    mutationFn: (input: CreateTaskInput) =>
      apiCall(tasksPath(listId), { method: "POST", body: input, response: taskViewSchema }),
    onMutate: async (input): Promise<CreateTaskContext> => {
      const queryKey = queryKeys.tasks(listId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TaskView[]>(queryKey);
      pendingCount += 1;
      const tempId = `${PENDING_PREFIX}${pendingCount}`;
      const temporary: TaskView = {
        id: tempId,
        title: input.title,
        description: input.description,
        estimate: input.estimate,
        unestimatedSubtasks: 0,
        subtasks: [],
      };
      queryClient.setQueryData<TaskView[]>(queryKey, (tasks) => tasks && [...tasks, temporary]);
      return { previous, tempId };
    },
    // Phase 3: for a subtask the server returns its parent, which replaces the parent's row.
    onSuccess: (task, _input, { tempId }) =>
      writeTasks(queryClient, listId, (tasks) => putTask(tasks, task, tempId)),
    // Only this add's own row goes: a snapshot would also drop other adds still in flight.
    onError: (_error, _input, context) => {
      queryClient.setQueryData<TaskView[]>(
        queryKeys.tasks(listId),
        (tasks) => tasks && tasks.filter((task) => task.id !== context?.tempId),
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
 * subtask, Phase 3, that is its parent, which replaces the parent's row). Every outcome refetches
 * the list, so after a 404 the deleted row disappears and after a 409 the row shows the server's
 * state.
 */
export function useUpdateTask(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: queryKeys.tasks(listId),
    mutationFn: async ({ id, input }: UpdateTaskVariables) =>
      apiCall(taskPath(id), { method: "PATCH", body: input, response: taskViewSchema }),
    onSuccess: (task, { id }) =>
      writeTasks(queryClient, listId, (tasks) => putTask(tasks, task, id)),
    onSettled: () => settle(queryClient, listId),
  });
}

/**
 * Deletes a task by id. Not optimistic: the row goes when the server answers `null`; a parent
 * `TaskView` (a deleted subtask, Phase 3) replaces the parent's row. Every outcome refetches.
 */
export function useDeleteTask(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: queryKeys.tasks(listId),
    mutationFn: async (id: string) =>
      apiCall(taskPath(id), { method: "DELETE", response: deleteTaskResponseSchema }),
    onSuccess: (parent, id) =>
      writeTasks(queryClient, listId, (tasks) =>
        parent === null ? tasks.filter((task) => task.id !== id) : putTask(tasks, parent, id),
      ),
    onSettled: () => settle(queryClient, listId),
  });
}
