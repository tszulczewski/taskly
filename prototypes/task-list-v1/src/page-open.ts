import { useEffect, useState } from "react";
import { slowMs } from "./scenarios";
import { wait } from "./server";
import { useDemo } from "./store";

/** Props every screen gets from the review page. */
export interface ScreenProps {
  /** The screen the review engine shows now. */
  active: boolean;
  /**
   * The page itself opens (arrival from another page, "Reload screen", an account switch), as
   * opposed to a view change inside the same page (s04 to s05–s08).
   */
  pageLoad: boolean;
}

/**
 * P12 for the sign-in pages: false while the page is still reading the session (a skeleton
 * shows). "Did not open" has no state on these pages in the map, so it opens as usual.
 */
export function usePageOpen({ active, pageLoad }: ScreenProps): boolean {
  const demo = useDemo();
  const waiting = active && pageLoad && demo.scenarios.page === "slow";
  // The screen is mounted again for every visit, so this starts false on each arrival.
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!waiting) return;
    let current = true;
    void wait(slowMs).then(() => {
      if (current) setDone(true);
    });
    return () => {
      current = false;
    };
  }, [waiting]);

  return !waiting || done;
}
