import { useCallback, useEffect, useRef, useState } from "react";
import type { ScreenProps } from "./page-open";
import { ReviewBar } from "./review-bar";
import { defaultScenarios, type Scenarios } from "./scenarios";
import { isScreenId, navigate, screens, type ScreenId } from "./screens";
import { SignInScreen } from "./screens/sign-in";
import { SignUpClosedScreen, SignUpScreen } from "./screens/sign-up";
import { TaskScreen } from "./screens/task-screen";
import type { StateGuide } from "./states";
import { useDemo } from "./store";

declare global {
  interface Window {
    __PROTOTYPE_START__?: () => boolean;
  }
}

/** s05–s08 are views inside the task list's page (s04): moving between them loads nothing. */
const taskPage: readonly ScreenId[] = ["s04", "s05", "s06", "s07", "s08"];
const onTaskPage = (id: ScreenId | null) => id !== null && taskPage.includes(id);

function ScreenContent({
  id,
  after,
  onAfterApplied,
  ...props
}: { id: ScreenId; after?: Partial<Scenarios>; onAfterApplied: () => void } & ScreenProps) {
  if (id === "s01") return <SignInScreen {...props} />;
  if (id === "s02") return <SignUpScreen {...props} />;
  if (id === "s03") return <SignUpClosedScreen {...props} />;
  return <TaskScreen screenId={id} after={after} onAfterApplied={onAfterApplied} {...props} />;
}

/**
 * The review page: every screen of the map is a permanent `section.screen` (the review engine's
 * contract), so comments stay pinned to it. A screen that is left is mounted again, which closes
 * its menus and dialogs and gives the next visit a fresh page; the data stays in the store.
 */
export function App() {
  const demo = useDemo();
  const [current, setCurrent] = useState<ScreenId>("s01");
  const currentRef = useRef<ScreenId>("s01");
  const [previous, setPrevious] = useState<ScreenId | null>(null);
  const [reloaded, setReloaded] = useState(false);
  const [visits, setVisits] = useState<Record<string, number>>({});
  const [guide, setGuide] = useState<StateGuide | null>(null);
  const [after, setAfter] = useState<{ screen: ScreenId; scenarios: Partial<Scenarios> } | null>(
    null,
  );

  const remount = (id: ScreenId) =>
    setVisits((counts) => ({ ...counts, [id]: (counts[id] ?? 0) + 1 }));

  /** Opens the current screen again as a fresh page, like the browser's reload. */
  const reload = useCallback(() => {
    remount(currentRef.current);
    setReloaded(true);
  }, []);

  useEffect(() => {
    const onChange = (event: Event) => {
      const id = (event as CustomEvent<unknown>).detail;
      if (typeof id !== "string" || !isScreenId(id)) return;
      const left = currentRef.current;
      if (left === id) return;
      currentRef.current = id;
      setCurrent(id);
      setPrevious(left);
      setReloaded(false);
      remount(left);
    };
    // A way out of a dialog that covers the review bar (e.g. P06 "never answers" on delete).
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && event.code === "KeyR") {
        event.preventDefault();
        reload();
      }
    };
    document.addEventListener("prototype:screen-change", onChange);
    window.addEventListener("keydown", onKey, true);
    window.__PROTOTYPE_START__?.();
    return () => {
      document.removeEventListener("prototype:screen-change", onChange);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [reload]);

  useEffect(() => {
    document.documentElement.dataset.theme = demo.theme;
  }, [demo.theme]);

  const reset = () => {
    demo.reset();
    setGuide(null);
    setAfter(null);
    setVisits((counts) =>
      Object.fromEntries(screens.map((screen) => [screen.id, (counts[screen.id] ?? 0) + 1])),
    );
    navigate("s01");
  };

  const goToState = (entry: StateGuide) => {
    const account = entry.account ?? (onTaskPage(entry.screen) ? "K2" : "K1");
    // Signing in sets P04 back to "valid", so the account goes first and the scenarios win.
    if ((demo.owner?.id ?? "K1") !== account) demo.switchAccount(account);
    demo.setScenarios({ ...defaultScenarios, ...entry.scenarios });
    if (entry.dataset) demo.setDataset(entry.dataset);
    else if (onTaskPage(entry.screen)) demo.restoreList();
    setGuide(entry);
    setAfter(entry.after ? { screen: entry.screen, scenarios: entry.after } : null);
    navigate(entry.screen);
    reload();
  };

  const pageLoad = (id: ScreenId) =>
    id === current && (reloaded || !onTaskPage(id) || !onTaskPage(previous));

  return (
    <div className="doc">
      <header className="doc-head">
        <h1>Taskly prototype: sign-in and tasks (E01)</h1>
        <p>
          Clickable prototype of the approved screen map, built from the design system. All data is
          fictitious.
        </p>
      </header>
      <ReviewBar
        current={current}
        guide={guide}
        onGuide={goToState}
        onReload={reload}
        onReset={reset}
      />
      {screens.map((screen) => (
        <section key={screen.id} id={screen.id} className="screen">
          <div className="screen-meta">
            <h2>
              {screen.id} {screen.name}
            </h2>
            <p>{screen.summary}</p>
          </div>
          <div className="frame">
            {/* A stable first child: the engine adds its pin layer after it, and comment anchors
                count siblings, so the screen's content must never move behind that layer. */}
            <div className="frame-body">
              <ScreenContent
                key={visits[screen.id] ?? 0}
                id={screen.id}
                active={current === screen.id}
                pageLoad={pageLoad(screen.id)}
                after={after?.screen === screen.id ? after.scenarios : undefined}
                onAfterApplied={() => setAfter(null)}
              />
            </div>
          </div>
          <div className="notes">
            <p className="note">
              <strong>Stories:</strong> {screen.note.stories}
            </p>
            <p className="note">
              <strong>Simulated:</strong> {screen.note.simulated}
            </p>
            <p className="note">
              <strong>Not decided here:</strong> {screen.note.open}
            </p>
          </div>
        </section>
      ))}
    </div>
  );
}
