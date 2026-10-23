"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

/** A duration token in ms, read from the root element (0 under reduced motion, tokens.css). */
export function tokenMs(name: `--${string}`): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const amount = Number.parseFloat(value);
  if (Number.isNaN(amount)) return 0;
  return value.endsWith("ms") ? amount : amount * 1000;
}

/**
 * Slides rows to their new place when the order changes for a reason other than dragging, e.g. a
 * completed task moving to the end (Luki 8: `motion-duration-base`, ease-out; nothing under
 * reduced motion). Call `snapshot()` just before the change; when `key` changes, every
 * `[data-move-id]` inside `container` that moved animates from where it was (FLIP).
 */
export function useMoveAnimation(container: RefObject<HTMLElement | null>, key: string) {
  const before = useRef<Map<string, number> | null>(null);

  useLayoutEffect(() => {
    const positions = before.current;
    before.current = null;
    if (positions === null || container.current === null) return;
    const duration = tokenMs("--motion-duration-base");
    if (duration === 0) return;
    const easing = getComputedStyle(document.documentElement)
      .getPropertyValue("--motion-easing")
      .trim();
    for (const row of container.current.querySelectorAll<HTMLElement>("[data-move-id]")) {
      const from = positions.get(String(row.dataset.moveId));
      const offset = from === undefined ? 0 : from - row.getBoundingClientRect().top;
      if (offset === 0) continue;
      row.animate([{ transform: `translateY(${offset}px)` }, { transform: "none" }], {
        duration,
        easing,
      });
    }
  }, [container, key]);

  return {
    snapshot() {
      if (container.current === null) return;
      before.current = new Map(
        Array.from(container.current.querySelectorAll<HTMLElement>("[data-move-id]"), (row) => [
          String(row.dataset.moveId),
          row.getBoundingClientRect().top,
        ]),
      );
    },
  };
}
