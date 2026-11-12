import { useMemo, useRef, useState } from "react";
import {
  FutureExpenses,
  QuickAdd,
  TaskList,
  type EstimateField,
  type EstimateValues,
  type ExpensesText,
  type Marker,
  type MovePosition,
  type Place,
  type PlaceOptions,
  type PlaceText,
  type NewPlaceValues,
  type SubmitResult,
  type TaskField,
  type TaskFormValues,
  type TaskItem,
  type TaskText,
} from "../../src";
import { never } from "./fake-api";
import { nextPlaceColor, placeMessages, placeNameRule } from "./place-data";
import {
  fromValues,
  futureExpenses,
  rollUp,
  taskMessages,
  validateEstimate,
  validateTask,
} from "./task-data";

/** How the simulated server answers every change: confirm, refuse, or never answer. */
export type ServerMode = "ok" | "fail" | "slow";

export interface TaskScreenProps {
  initialTasks: TaskItem[];
  initialStatus?: "loading" | "error" | "ready";
  server?: ServerMode;
  /** How long the server takes, in ms. */
  delay?: number;
  heading?: string;
  /** Focus the quick-add title on mount (spec E01: an empty list puts focus there). */
  autoFocus?: boolean;
  /** Turns on order, markers and places (E02) with these places of the list. */
  initialPlaces?: Place[];
  /** Turns on completion and future expenses (E03); the total starts in this state. */
  expenses?: "loading" | "error" | "ready";
  text?: Partial<TaskText>;
  placeText?: Partial<PlaceText>;
  expensesText?: Partial<ExpensesText>;
}

/** The app's limit of places (decision G5). */
const placeLimit = 20;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Moves `id` within its own group (the list, or one task's subtasks) to its new neighbours. */
export const reorder = (tasks: TaskItem[], id: string, position: MovePosition): TaskItem[] => {
  const moved = tasks.find((item) => item.id === id);
  if (!moved) {
    return tasks.map((item) =>
      item.subtasks ? { ...item, subtasks: reorder(item.subtasks, id, position) } : item,
    );
  }
  const rest = tasks.filter((item) => item.id !== id);
  const index =
    position.afterId === null
      ? rest.findIndex((item) => item.id === position.beforeId)
      : rest.findIndex((item) => item.id === position.afterId) + 1;
  return [...rest.slice(0, index), moved, ...rest.slice(index)];
};

/**
 * Completing a task completes its subtasks (R09); reopening changes only that row (R11) and puts it
 * first among its siblings (decision 2026-10-21).
 */
export const setCompleted = (tasks: TaskItem[], id: string, completed: boolean): TaskItem[] => {
  const changed = tasks.find((item) => item.id === id);
  if (!changed) {
    return tasks.map((item) =>
      item.subtasks ? { ...item, subtasks: setCompleted(item.subtasks, id, completed) } : item,
    );
  }
  if (!completed) {
    return [{ ...changed, completed: false }, ...tasks.filter((item) => item.id !== id)];
  }
  return tasks.map((item) =>
    item.id === id
      ? {
          ...item,
          completed: true,
          ...(item.subtasks
            ? { subtasks: item.subtasks.map((subtask) => ({ ...subtask, completed: true })) }
            : {}),
        }
      : item,
  );
};

/** Display order only, as the server sorts (decision 2026-10-21): open first, then completed. */
export const forDisplay = (tasks: TaskItem[]): TaskItem[] => {
  const shown = tasks.map((item) =>
    item.subtasks ? { ...item, subtasks: forDisplay(item.subtasks) } : item,
  );
  return [
    ...shown.filter((item) => item.completed !== true),
    ...shown.filter((item) => item.completed === true),
  ];
};

const mapTasks = (tasks: TaskItem[], change: (task: TaskItem) => TaskItem | null): TaskItem[] =>
  tasks.flatMap((item) => {
    const changed = change(item);
    if (changed === null) return [];
    return [
      changed.subtasks ? { ...changed, subtasks: mapTasks(changed.subtasks, change) } : changed,
    ];
  });

/** The top-level task that holds subtask `id`, if it is one. */
const parentOf = (tasks: TaskItem[], id: string) =>
  tasks.find((item) => item.subtasks?.some((subtask) => subtask.id === id));

/** A roll-up note lasts until the next change (spec E01, Roll-up messages). */
const withoutNotices = (tasks: TaskItem[]) =>
  tasks.map((item) => (item.notice ? { ...item, notice: undefined } : item));

/**
 * Screens S5 and S7 as the app would wire them (spec E01, Optimistic UI), with the server
 * simulated (P1): an add shows a pending row at once, the new row is highlighted when confirmed,
 * and a refusal rolls back with the message on the form. With `initialPlaces`, moves, markers and
 * places (E02) show at once too and roll back with a message in the row. With `expenses`,
 * completion (E03) works the same way and future expenses follow every change (S8).
 */
export function TaskScreen({
  initialTasks,
  initialStatus = "ready",
  server = "ok",
  delay = 600,
  heading = "My renovation",
  autoFocus = false,
  initialPlaces,
  expenses,
  text,
  placeText,
  expensesText,
}: TaskScreenProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [places, setPlaces] = useState(initialPlaces ?? []);
  const [status, setStatus] = useState(initialStatus);
  const [retrying, setRetrying] = useState(false);
  const [highlightId, setHighlightId] = useState<string>();
  const [expensesStatus, setExpensesStatus] = useState(expenses ?? "ready");
  const [expensesRetrying, setExpensesRetrying] = useState(false);
  const nextId = useRef(0);
  const shown = useMemo(() => forDisplay(tasks.map(rollUp)), [tasks]);
  const summary = useMemo(() => futureExpenses(tasks), [tasks]);

  const confirmed = async () => {
    if (server === "slow") await never();
    await wait(delay);
    return server === "ok";
  };

  const add = async (
    parentId: string | null,
    values: TaskFormValues,
  ): Promise<SubmitResult<TaskField>> => {
    nextId.current += 1;
    const tempId = `temp-${nextId.current}`;
    // The first subtask replaces the task's own estimate with the subtasks' sum (R12, R15).
    const parent = tasks.find((item) => item.id === parentId);
    const startsSum =
      parent !== undefined &&
      (parent.subtasks ?? []).every((subtask) => subtask.pending) &&
      rollUp(parent).estimate !== null;
    const pendingRow = { ...fromValues(tempId, values), pending: true };
    const append = (list: TaskItem[]) =>
      parentId === null
        ? [...list, pendingRow]
        : mapTasks(list, (item) =>
            item.id === parentId
              ? { ...item, subtasks: [...(item.subtasks ?? []), pendingRow] }
              : item,
          );
    setTasks((list) => append(withoutNotices(list)));
    if (!(await confirmed())) {
      setTasks((list) => mapTasks(list, (item) => (item.id === tempId ? null : item)));
      return { ok: false, formError: taskMessages.addFailed };
    }
    const id = `new-${nextId.current}`;
    setTasks((list) =>
      mapTasks(list, (item) => {
        if (item.id === tempId) return fromValues(id, values);
        if (startsSum && item.id === parentId) {
          return { ...item, notice: taskMessages.sumStarted(item.title) };
        }
        return item;
      }),
    );
    setHighlightId(id);
    return { ok: true };
  };

  const edit = async (id: string, values: TaskFormValues): Promise<SubmitResult<TaskField>> => {
    if (!(await confirmed())) return { ok: false, formError: taskMessages.saveFailed };
    setTasks((list) =>
      mapTasks(withoutNotices(list), (item) =>
        item.id === id ? fromValues(id, values, item) : item,
      ),
    );
    return { ok: true };
  };

  const remove = async (id: string) => {
    const ok = await confirmed();
    if (!ok) return ok;
    setTasks((list) => {
      const parentId = parentOf(list, id)?.id;
      return mapTasks(withoutNotices(list), (item) => {
        if (item.id === id) return null;
        if (item.id !== parentId) return item;
        // Deleting the last subtask brings the task's own estimate back (R15).
        const after = rollUp({
          ...item,
          subtasks: item.subtasks?.filter((subtask) => subtask.id !== id),
        });
        return after.subtasks?.length === 0 && after.estimate !== null
          ? { ...after, notice: taskMessages.sumBack(item.title, after.estimate) }
          : after;
      });
    });
    return ok;
  };

  /** Optimistic: the change shows at once and is undone with a message if the server refuses. */
  const optimistic = async (
    id: string,
    change: (list: TaskItem[]) => TaskItem[],
    message: (title: string) => string,
  ) => {
    const before = tasks;
    setTasks((list) =>
      change(mapTasks(withoutNotices(list), (item) => ({ ...item, error: undefined }))),
    );
    if (await confirmed()) return;
    const title = (function find(list: TaskItem[]): string {
      for (const item of list) {
        if (item.id === id) return item.title;
        const inner = find(item.subtasks ?? []);
        if (inner !== "") return inner;
      }
      return "";
    })(before);
    setTasks(
      mapTasks(before, (item) => (item.id === id ? { ...item, error: message(title) } : item)),
    );
  };

  const move = (id: string, position: MovePosition) =>
    void optimistic(id, (list) => reorder(list, id, position), taskMessages.moveFailed);

  const toggleComplete = (id: string, completed: boolean) =>
    void optimistic(id, (list) => setCompleted(list, id, completed), taskMessages.changeFailed);

  const addEstimate = async (
    id: string,
    values: EstimateValues,
  ): Promise<SubmitResult<EstimateField>> => {
    if (!(await confirmed())) return { ok: false, formError: taskMessages.estimateFailed };
    setTasks((list) =>
      mapTasks(list, (item) =>
        item.id === id
          ? fromValues(
              id,
              { title: item.title, description: item.description ?? "", ...values },
              item,
            )
          : item,
      ),
    );
    return { ok: true };
  };

  const toggleMarker = (id: string, marker: Marker, on: boolean) =>
    void optimistic(
      id,
      (list) => mapTasks(list, (item) => (item.id === id ? { ...item, [marker]: on } : item)),
      taskMessages.changeFailed,
    );

  const assign = (taskId: string, place: Place, on: boolean) => (list: TaskItem[]) =>
    mapTasks(list, (item) => {
      if (item.id !== taskId) return item;
      const rest = (item.places ?? []).filter((own) => own.id !== place.id);
      return { ...item, places: on ? [...rest, place] : rest };
    });

  const placeOptions: PlaceOptions = {
    status: "ready",
    onRetry: () => undefined,
    all: places,
    atLimit: places.length >= placeLimit,
    validateName: placeNameRule(places),
    onToggle: (taskId, placeId, on) => {
      const place = places.find((own) => own.id === placeId);
      if (place) void optimistic(taskId, assign(taskId, place, on), taskMessages.changeFailed);
    },
    onCreate: async (taskId, values: NewPlaceValues) => {
      if (!(await confirmed())) return { ok: false, formError: placeMessages.createFailed };
      nextId.current += 1;
      const place: Place = {
        id: `place-${nextId.current}`,
        name: values.name.trim(),
        color: nextPlaceColor(places),
      };
      setPlaces((list) => [...list, place]);
      setTasks(assign(taskId, place, true));
      return { ok: true };
    },
    onUpdate: async (placeId, values) => {
      if (!(await confirmed())) return { ok: false, formError: placeMessages.saveFailed };
      const update = (place: Place) =>
        place.id === placeId ? { ...place, name: values.name.trim(), color: values.color } : place;
      setPlaces((list) => list.map(update));
      setTasks((list) =>
        mapTasks(list, (item) =>
          item.places ? { ...item, places: item.places.map(update) } : item,
        ),
      );
      return { ok: true };
    },
    onDelete: async (placeId) => {
      const ok = await confirmed();
      if (!ok) return false;
      setPlaces((list) => list.filter((place) => place.id !== placeId));
      setTasks((list) =>
        mapTasks(list, (item) =>
          item.places
            ? { ...item, places: item.places.filter((place) => place.id !== placeId) }
            : item,
        ),
      );
      return true;
    },
    text: placeText,
  };
  const organized = initialPlaces !== undefined;

  const retry = async () => {
    setRetrying(true);
    await wait(delay);
    setRetrying(false);
    if (server === "ok") setStatus("ready");
  };

  const retryExpenses = async () => {
    setExpensesRetrying(true);
    await wait(delay);
    setExpensesRetrying(false);
    if (server === "ok") setExpensesStatus("ready");
  };

  return (
    <div className="flex flex-col gap-between-groups">
      <h1 className="text-heading font-strong">{heading}</h1>
      {expenses !== undefined && (
        <FutureExpenses
          status={expensesStatus}
          total={summary.total}
          unestimated={summary.unestimated}
          onRetry={() => void retryExpenses()}
          retrying={expensesRetrying}
          validate={validateEstimate}
          onAddEstimate={addEstimate}
          text={expensesText}
        />
      )}
      <QuickAdd
        validate={validateTask}
        onSubmit={(values) => add(null, values)}
        autoFocus={autoFocus}
        text={text}
      />
      <TaskList
        status={status}
        tasks={shown}
        onRetry={() => void retry()}
        retrying={retrying}
        validate={validateTask}
        onEdit={edit}
        onAddSubtask={(parentId, values) => add(parentId, values)}
        onDelete={remove}
        highlightId={highlightId}
        {...(organized ? { onMove: move, onToggleMarker: toggleMarker, places: placeOptions } : {})}
        {...(expenses !== undefined ? { onToggleComplete: toggleComplete } : {})}
        text={text}
      />
    </div>
  );
}
