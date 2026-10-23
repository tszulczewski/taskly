// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tokenMs, useMoveAnimation } from "./use-move-animation";

const tokens: Record<string, string> = {};
const animate = vi.fn();

beforeEach(() => {
  vi.spyOn(window, "getComputedStyle").mockReturnValue({
    getPropertyValue: (name: string) => tokens[name] ?? "",
  } as CSSStyleDeclaration);
  Element.prototype.animate = animate;
  Element.prototype.getBoundingClientRect = function (this: HTMLElement) {
    return { top: Number(this.dataset.top ?? 0) } as DOMRect;
  };
  tokens["--motion-duration-base"] = "200ms";
  tokens["--motion-easing"] = " ease-out";
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  animate.mockClear();
});

describe("tokenMs", () => {
  it("reads ms, s and nothing", () => {
    expect(tokenMs("--motion-duration-base")).toBe(200);
    tokens["--x"] = "0.15s";
    expect(tokenMs("--x")).toBe(150);
    expect(tokenMs("--missing")).toBe(0);
  });
});

type Row = { id: string; top: number };
const snapshot = () => fireEvent.click(screen.getByRole("button", { name: "Snapshot" }));

function List({ rows, hidden = false }: { rows: Row[]; hidden?: boolean }) {
  const ref = useRef<HTMLUListElement>(null);
  const animation = useMoveAnimation(ref, rows.map((row) => row.id).join(" "));
  return (
    <>
      <button type="button" onClick={animation.snapshot}>
        Snapshot
      </button>
      {hidden ? null : (
        <ul ref={ref}>
          {rows.map((row) => (
            <li key={row.id} data-move-id={row.id} data-top={row.top} />
          ))}
        </ul>
      )}
    </>
  );
}

const a = { id: "a", top: 0 };
const b = { id: "b", top: 50 };

describe("useMoveAnimation", () => {
  it("slides rows that moved from where they were", () => {
    const { rerender } = render(<List rows={[a, b]} />);
    snapshot();
    rerender(
      <List
        rows={[
          { ...b, top: 0 },
          { ...a, top: 50 },
          { id: "new", top: 100 },
        ]}
      />,
    );
    expect(animate).toHaveBeenCalledTimes(2);
    expect(animate).toHaveBeenCalledWith(
      [{ transform: "translateY(50px)" }, { transform: "none" }],
      { duration: 200, easing: "ease-out" },
    );
  });

  it("does nothing without a snapshot, for rows that stayed, or with reduced motion", () => {
    const { rerender } = render(<List rows={[a, b]} />);
    rerender(<List rows={[b, a]} />);
    snapshot();
    rerender(<List rows={[a, b]} />);
    expect(animate).not.toHaveBeenCalled();
    tokens["--motion-duration-base"] = "0ms";
    snapshot();
    rerender(
      <List
        rows={[
          { ...b, top: 0 },
          { ...a, top: 50 },
        ]}
      />,
    );
    expect(animate).not.toHaveBeenCalled();
  });

  it("ignores a list that is not on screen", () => {
    const { rerender } = render(<List rows={[a, b]} hidden />);
    snapshot();
    rerender(<List rows={[b, a]} hidden />);
    expect(animate).not.toHaveBeenCalled();
  });
});
