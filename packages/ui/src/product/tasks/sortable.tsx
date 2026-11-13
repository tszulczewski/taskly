"use client";

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type KeyboardSensorProps,
  type Modifier,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { ReactNode } from "react";

/** Where a moved row lands, as its new neighbours; the app turns it into a fractional `position`. */
export interface MovePosition {
  afterId: string | null;
  beforeId: string | null;
}

/** The new neighbours of `activeId` when it takes the place of `overId`; null when nothing moves. */
export function moveTarget(ids: string[], activeId: string, overId: string): MovePosition | null {
  const from = ids.indexOf(activeId);
  const to = ids.indexOf(overId);
  if (from === -1 || to === -1 || from === to) return null;
  const order = arrayMove(ids, from, to);
  return { afterId: order[to - 1] ?? null, beforeId: order[to + 1] ?? null };
}

/** One step up (-1) or down (+1), as "Move up" / "Move down" in the row menu; null at an end. */
export function stepTarget(ids: string[], id: string, step: -1 | 1): MovePosition | null {
  const index = ids.indexOf(id);
  // A row outside the group (pending, completed) does not move.
  if (index === -1) return null;
  const over = ids[index + step];
  return over === undefined ? null : moveTarget(ids, id, over);
}

/** "Move up" / "Move down" for one row; null at the top or bottom of its group. */
export interface RowMove {
  up: (() => void) | null;
  down: (() => void) | null;
}

export function rowMove(
  ids: string[],
  id: string,
  onMove: (id: string, position: MovePosition) => void,
): RowMove {
  const step = (direction: -1 | 1) => {
    const target = stepTarget(ids, id, direction);
    return target ? () => onMove(id, target) : null;
  };
  return { up: step(-1), down: step(1) };
}

export const isDragHandle = (target: EventTarget | null) =>
  target instanceof Element && target.closest("[data-drag-handle]") !== null;

const [mouseActivator] = MouseSensor.activators;
const [keyboardActivator] = KeyboardSensor.activators;

/** Mouse and keyboard start a drag only from the handle; the rest of the row stays clickable. */
export class HandleMouseSensor extends MouseSensor {
  static activators: typeof MouseSensor.activators = [
    {
      eventName: "onMouseDown",
      handler: (event, options) =>
        isDragHandle(event.nativeEvent.target) && mouseActivator!.handler(event, options),
    },
  ];
}

/** The parts of dnd-kit 6's `KeyboardSensor` that TypeScript marks private but the cancel needs. */
interface KeyboardSensorInternals {
  windowListeners: {
    add(eventName: string, handler: () => void, options?: AddEventListenerOptions): void;
  };
  detach(): void;
}

export class HandleKeyboardSensor extends KeyboardSensor {
  static activators: typeof KeyboardSensor.activators = [
    {
      eventName: "onKeyDown",
      handler: (event, options, context) =>
        isDragHandle(event.nativeEvent.target) &&
        keyboardActivator!.handler(event, options, context),
    },
  ];

  /**
   * dnd-kit ends a keyboard move only on Space, Enter or Escape, so a click elsewhere left the
   * row lifted (above the menus) and blocked every pointer drag until a key was pressed. Any
   * pointer press now cancels it as Escape does; it is not prevented, so the same click still
   * opens a menu or picks up a handle. The listener goes with the sensor's own on end or cancel.
   */
  constructor(props: KeyboardSensorProps) {
    super(props);
    const sensor = this as unknown as KeyboardSensorInternals;
    sensor.windowListeners.add(
      "pointerdown",
      () => {
        sensor.detach();
        props.onCancel();
      },
      { capture: true },
    );
  }
}

/** Rows move only up and down. */
export const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

/**
 * A long press starts a drag anywhere on the row on touch screens (decision G2); the delay lets a
 * short tap and scrolling work as usual. dnd-kit's suggested values (proposal).
 */
const longPress = { delay: 250, tolerance: 5 };

export interface SortableText {
  dragInstructions: string;
  pickedUp: (title: string) => string;
  movedOver: (title: string, overTitle: string) => string;
  dropped: (title: string, overTitle: string) => string;
  cancelled: (title: string) => string;
}

export interface SortableGroupProps {
  /** The rows that can move, in order; their titles are read out while moving. */
  items: { id: string; title: string }[];
  /**
   * None while the group cannot reorder (a viewer, or the app pausing moves). The group stays
   * mounted either way, so turning moves off and on keeps the rows' state (expanded, editing).
   */
  onMove?: (id: string, position: MovePosition) => void;
  text: SortableText;
  children: ReactNode;
}

/**
 * One group of rows that reorder among themselves: the tasks of a list, or the subtasks of one
 * task (decision G1). Rows never leave their group. Only the moved row gets a new position
 * (AGENTS.md: fractional indexing).
 */
export function SortableGroup({ items, onMove, text, children }: SortableGroupProps) {
  const ids = onMove ? items.map((item) => item.id) : [];
  const title = (id: UniqueIdentifier) =>
    items.find((item) => item.id === String(id))?.title ?? String(id);
  const sensors = useSensors(
    useSensor(HandleMouseSensor),
    useSensor(TouchSensor, { activationConstraint: longPress }),
    useSensor(HandleKeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  return (
    <DndContext
      sensors={onMove ? sensors : []}
      collisionDetection={closestCenter}
      modifiers={[verticalOnly]}
      accessibility={{
        screenReaderInstructions: { draggable: text.dragInstructions },
        announcements: {
          onDragStart: ({ active }) => text.pickedUp(title(active.id)),
          onDragOver: ({ active, over }) =>
            over ? text.movedOver(title(active.id), title(over.id)) : undefined,
          onDragEnd: ({ active, over }) =>
            over
              ? text.dropped(title(active.id), title(over.id))
              : text.cancelled(title(active.id)),
          onDragCancel: ({ active }) => text.cancelled(title(active.id)),
        },
      }}
      onDragEnd={({ active, over }) => {
        const target = over ? moveTarget(ids, String(active.id), String(over.id)) : null;
        // Without `onMove` there are no sensors and no items, so no drag ever ends here.
        if (target) onMove!(String(active.id), target);
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}
