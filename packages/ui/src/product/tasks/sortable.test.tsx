// @vitest-environment jsdom
import type { DndContextProps } from "@dnd-kit/core";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement, type KeyboardEvent, type MouseEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DragHandle } from "./drag-handle";
import { Markers } from "./markers";
import {
  HandleKeyboardSensor,
  HandleMouseSensor,
  SortableGroup,
  isDragHandle,
  moveTarget,
  rowMove,
  stepTarget,
  verticalOnly,
} from "./sortable";
import { defaultTaskText } from "./text";

const dnd = vi.hoisted(() => ({ props: [] as DndContextProps[] }));

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    DndContext: (props: DndContextProps) => {
      dnd.props.push(props);
      return createElement(actual.DndContext, props);
    },
  };
});

afterEach(() => {
  cleanup();
  dnd.props.length = 0;
});

const ids = ["paint", "seal", "rods"];

describe("moveTarget", () => {
  it("names the new neighbours of the moved row", () => {
    expect(moveTarget(ids, "paint", "seal")).toEqual({ afterId: "seal", beforeId: "rods" });
    expect(moveTarget(ids, "rods", "paint")).toEqual({ afterId: null, beforeId: "paint" });
    expect(moveTarget(ids, "paint", "rods")).toEqual({ afterId: "rods", beforeId: null });
  });

  it("moves nothing onto itself or with an unknown row", () => {
    expect(moveTarget(ids, "seal", "seal")).toBeNull();
    expect(moveTarget(ids, "temp-1", "seal")).toBeNull();
    expect(moveTarget(ids, "seal", "temp-1")).toBeNull();
  });
});

describe("stepTarget and rowMove", () => {
  it("steps one place, and not past an end", () => {
    expect(stepTarget(ids, "seal", -1)).toEqual({ afterId: null, beforeId: "paint" });
    expect(stepTarget(ids, "seal", 1)).toEqual({ afterId: "rods", beforeId: null });
    expect(stepTarget(ids, "paint", -1)).toBeNull();
    expect(stepTarget(ids, "rods", 1)).toBeNull();
    // A completed or pending row is not in the group.
    expect(stepTarget(ids, "done", 1)).toBeNull();
  });

  it("offers Move up and Move down only where they move", () => {
    const onMove = vi.fn();
    const first = rowMove(ids, "paint", onMove);
    expect(first.up).toBeNull();
    first.down?.();
    expect(onMove).toHaveBeenCalledWith("paint", { afterId: "seal", beforeId: "rods" });
    expect(rowMove(ids, "rods", onMove).down).toBeNull();
  });
});

describe("sensors", () => {
  const handle = document.createElement("button");
  handle.setAttribute("data-drag-handle", "");
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  handle.append(icon);
  const title = document.createElement("span");

  it("recognises the handle and anything inside it", () => {
    expect(isDragHandle(handle)).toBe(true);
    expect(isDragHandle(icon)).toBe(true);
    expect(isDragHandle(title)).toBe(false);
    expect(isDragHandle(null)).toBe(false);
  });

  it("starts a mouse drag only from the handle", () => {
    const [activator] = HandleMouseSensor.activators;
    const onActivation = vi.fn();
    const press = (target: Element) =>
      activator!.handler({ nativeEvent: { target, button: 0 } } as unknown as MouseEvent, {
        onActivation,
      });
    expect(press(title)).toBe(false);
    expect(onActivation).not.toHaveBeenCalled();
    expect(press(icon)).toBe(true);
    expect(onActivation).toHaveBeenCalledOnce();
  });

  it("starts a keyboard drag only from the handle", () => {
    const [activator] = HandleKeyboardSensor.activators;
    const onActivation = vi.fn();
    const press = (target: Element) =>
      activator!.handler(
        {
          target,
          nativeEvent: { target, code: "Space" },
          preventDefault: vi.fn(),
        } as unknown as KeyboardEvent,
        { onActivation },
        { active: { activatorNode: { current: handle } } } as never,
      );
    expect(press(title)).toBe(false);
    expect(press(handle)).toBe(true);
    expect(onActivation).toHaveBeenCalledOnce();
  });

  it("keeps rows on their vertical line", () => {
    const transform = { x: 12, y: 40, scaleX: 1, scaleY: 1 };
    expect(verticalOnly({ transform } as Parameters<typeof verticalOnly>[0])).toEqual({
      ...transform,
      x: 0,
    });
  });
});

describe("SortableGroup", () => {
  const items = [
    { id: "paint", title: "Paint the ceiling" },
    { id: "seal", title: "Seal the bath" },
  ];
  const active = (id: string) => ({ id }) as never;

  function renderGroup() {
    const onMove = vi.fn();
    render(
      <SortableGroup items={items} onMove={onMove} text={defaultTaskText}>
        <ul aria-label="Tasks" />
      </SortableGroup>,
    );
    const props = dnd.props.at(-1)!;
    return { onMove, props, announce: props.accessibility!.announcements! };
  }

  it("sends only the moved row's new neighbours", () => {
    const { onMove, props } = renderGroup();
    act(() => props.onDragEnd!({ active: active("paint"), over: active("seal") } as never));
    expect(onMove).toHaveBeenCalledWith("paint", { afterId: "seal", beforeId: null });
    onMove.mockClear();
    act(() => props.onDragEnd!({ active: active("paint"), over: null } as never));
    act(() => props.onDragEnd!({ active: active("paint"), over: active("paint") } as never));
    expect(onMove).not.toHaveBeenCalled();
  });

  it("reads out every step of a move by title", () => {
    const { announce, props } = renderGroup();
    expect(props.accessibility?.screenReaderInstructions?.draggable).toBe(
      defaultTaskText.dragInstructions,
    );
    const paint = active("paint");
    const seal = active("seal");
    expect(announce.onDragStart({ active: paint })).toBe(
      defaultTaskText.pickedUp("Paint the ceiling"),
    );
    expect(announce.onDragOver({ active: paint, over: seal })).toBe(
      defaultTaskText.movedOver("Paint the ceiling", "Seal the bath"),
    );
    expect(announce.onDragOver({ active: paint, over: null })).toBeUndefined();
    expect(announce.onDragEnd({ active: paint, over: seal })).toBe(
      defaultTaskText.dropped("Paint the ceiling", "Seal the bath"),
    );
    expect(announce.onDragEnd({ active: paint, over: null })).toBe(
      defaultTaskText.cancelled("Paint the ceiling"),
    );
    // A row that left the group meanwhile is named by its id.
    expect(announce.onDragCancel({ active: active("temp-1"), over: null })).toBe(
      defaultTaskText.cancelled("temp-1"),
    );
  });
});

describe("Markers", () => {
  it("shows each marker as a word, or nothing", () => {
    const { container, rerender } = render(<Markers />);
    expect(container.textContent).toBe("");
    rerender(<Markers important urgent />);
    expect(screen.getByText("Important").dataset.slot).toBe("marker");
    expect(screen.getByText("Urgent")).toBeTruthy();
    rerender(<Markers urgent importantText="Ważne" urgentText="Pilne" />);
    expect(container.textContent).toBe("Pilne");
  });
});

describe("DragHandle", () => {
  it("is a named grip button marked as the handle", () => {
    const onKeyDown = vi.fn();
    render(<DragHandle label="Move “Seal the bath”" className="extra" onKeyDown={onKeyDown} />);
    const handle = screen.getByRole("button", { name: "Move “Seal the bath”" });
    expect(handle.hasAttribute("data-drag-handle")).toBe(true);
    expect(handle.className).toContain("extra");
    fireEvent.keyDown(handle, { key: "Enter" });
    expect(onKeyDown).toHaveBeenCalledOnce();
  });

  it("captions itself with its name on focus (decision N4)", async () => {
    render(<DragHandle label="Move “Seal the bath”" />);
    const handle = screen.getByRole("button", { name: "Move “Seal the bath”" });
    await act(async () => {
      handle.focus();
    });
    expect(document.querySelector('[data-slot="tooltip"]')?.textContent).toBe(
      "Move “Seal the bath”",
    );
  });
});
