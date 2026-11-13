"use client";

import {
  Alert,
  type EstimateField,
  type EstimateValues,
  FutureExpenses,
  type Marker,
  type MovePosition,
  type PlaceOptions,
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
import { PLACE_LIMIT, placeNameError, type PlaceView, TASK_COMPLETED_MESSAGE } from "@taskly/core";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import {
  addEstimateError,
  hasTask,
  isNotFound,
  isPendingTaskId,
  isPlaceNotFound,
  placeSubmitError,
  subtaskAdded,
  subtaskDeleted,
  submitError,
  PLACE_TEXT,
  TASK_SCREEN_TEXT,
  titleOf,
  toCreateInput,
  toEstimate,
  toPlace,
  toTaskItem,
  toUpdateInput,
  validateEstimate,
  validateTaskForm,
} from "./task-items";
import {
  useAddEstimate,
  useCreateTask,
  useDeleteTask,
  useFutureExpenses,
  useMoveTask,
  usePlaces,
  useSetCompleted,
  useTaskViews,
  useToggleMarker,
  useTogglePlace,
  useUpdateTask,
} from "./use-tasks";
import { useCreatePlace, useDeletePlace, useUpdatePlace } from "./use-places";

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
  // Hook-level, so it runs for every toggle, not only the last one (lesson 2026-10-30). A 404: the
  // row is gone (deleted elsewhere), and the refetch removes it. Otherwise the replay has already
  // put the row back, and the row says so.
  const changeFailed = (error: unknown, { id, title }: { id: string; title: string }) => {
    if (isNotFound(error)) setGoneId(id);
    else setRowError({ taskId: id, text: TASK_SCREEN_TEXT.changeFailed(title) });
  };
  const setCompleted = useSetCompleted(listId, { onError: changeFailed });
  const toggleMarker = useToggleMarker(listId, { onError: changeFailed });
  const moveTask = useMoveTask(listId, {
    onError: (error, { id, title }) => {
      if (isNotFound(error)) setGoneId(id);
      else setRowError({ taskId: id, text: TASK_SCREEN_TEXT.moveFailed(title) });
    },
  });
  const places = usePlaces();
  const createPlace = useCreatePlace();
  const updatePlace = useUpdatePlace(listId);
  const deletePlace = useDeletePlace(listId);
  // A 404 about the place: deleted meanwhile. Deleted here, its tick was already skipped by the
  // replay and nothing went back (P9); deleted elsewhere, the row says the tick went back.
  const queryClient = useQueryClient();
  const togglePlace = useTogglePlace(listId, {
    onError: (error, variables) => {
      if (!isPlaceNotFound(error)) return changeFailed(error, variables);
      // Read from the cache, not this render: a delete in this tab may have landed since.
      const cached = queryClient
        .getQueryData<PlaceView[]>(queryKeys.places())
        ?.some((place) => place.id === variables.placeId);
      if (cached) {
        setRowError({ taskId: variables.id, text: TASK_SCREEN_TEXT.changeFailed(variables.title) });
      }
    },
  });
  const [placesRetrying, setPlacesRetrying] = useState(false);
  // A refetch of a list that never loaded goes back to "pending"; the failure stays on screen,
  // with "Trying again…", until it answers.
  const [retrying, setRetrying] = useState(false);
  const [expensesRetrying, setExpensesRetrying] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);
  const views = shown ?? [];
  const goneShown = goneId !== null && !hasTask(views, goneId);

  // With Cache Components a page the user left is hidden (React Activity), not unmounted; it comes
  // back without the last add's highlight or an old message.
  useLayoutEffect(
    () => () => {
      setHighlightId(undefined);
      setGoneId(null);
      setNotice(null);
      setRowError(null);
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

  // "Important" / "Urgent" in the "…" of a row on screen (spec E02, #18): shown at once by the
  // replay, saved in the list queue.
  const markTask = (id: string, marker: Marker, on: boolean) => {
    startChange();
    toggleMarker.mutate({ id, marker, on, title: titleOf(views, id) });
  };

  // Drag, keyboard and "Move up / Move down" (spec E02, #17): shown at once by the replay, saved
  // in the list queue with only the new neighbours.
  const move = (id: string, { afterId, beforeId }: MovePosition) => {
    startChange();
    moveTask.mutate({ id, afterId, beforeId, title: titleOf(views, id) });
  };
  // A quick add still saving is outside the move groups, so a move picked now could name a last
  // neighbour that is no longer last once it is saved: no reordering anywhere in the list until
  // it settles (P1, P10; one `onMove` serves tasks and subtasks).
  const adding = views.some(
    (task) => isPendingTaskId(task.id) || task.subtasks.some(({ id }) => isPendingTaskId(id)),
  );

  const ownPlaces = places.data ?? [];
  const tickPlace = (id: string, placeId: string, assigned: boolean) => {
    startChange();
    togglePlace.mutate({ id, placeId, assigned, title: titleOf(views, id) });
  };
  // A refetch keeps the last places, but a failed one shows the error (lesson 2026-11-05), and
  // "Trying again…" keeps the failure, and its focused button, on screen until the answer.
  const placeOptions: PlaceOptions = {
    status:
      places.isError || placesRetrying ? "error" : places.data !== undefined ? "ready" : "loading",
    retrying: placesRetrying,
    onRetry: () => {
      setPlacesRetrying(true);
      void places.refetch().then(() => setPlacesRetrying(false));
    },
    all: ownPlaces.map(toPlace),
    atLimit: ownPlaces.length >= PLACE_LIMIT,
    validateName: (name, placeId) => placeNameError(name, ownPlaces, placeId),
    onToggle: tickPlace,
    // Create, then tick through the list queue (the design system's create-and-tick). If the tick
    // fails, the place stays in the list unticked and the row says so.
    onCreate: async (taskId, { name }) => {
      try {
        const place = await createPlace.mutateAsync(name);
        tickPlace(taskId, place.id, true);
        return { ok: true };
      } catch (error) {
        return placeSubmitError(error, PLACE_TEXT.createFailed);
      }
    },
    onUpdate: async (placeId, values) => {
      try {
        await updatePlace.mutateAsync({ placeId, ...values });
        return { ok: true };
      } catch (error) {
        return placeSubmitError(error, PLACE_TEXT.saveFailed);
      }
    },
    onDelete: (placeId) => deletePlace.mutateAsync(placeId).then(() => true),
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
          onToggleMarker={markTask}
          onMove={adding ? undefined : move}
          places={placeOptions}
          highlightId={highlightId}
        />
      </div>
    </div>
  );
}
