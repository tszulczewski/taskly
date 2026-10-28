import { useEffect, useId, useState, type ReactNode } from "react";
import { Button, Checkbox, Label, ThemeToggle } from "@taskly/ui";
import { demoNowText } from "./data";
import {
  datasetOptions,
  defaultScenarios,
  scenarioOptions,
  type Dataset,
  type Scenarios,
} from "./scenarios";
import { screens, type ScreenId } from "./screens";
import { stateGuide, type StateGuide } from "./states";
import { useDemo, type AccountId } from "./store";

const accounts: { id: AccountId; label: string }[] = [
  { id: "K1", label: "K1 guest (not signed in)" },
  { id: "K2", label: "K2 Marta Zielińska, 4 tasks" },
  { id: "K3", label: "K3 Jan Kowal, empty list" },
  { id: "K4", label: "K4 Ewa Lis, 1 task" },
];

const widths = [320, 768, 1440];

/** A label and a native select. DESIGN-SYSTEM GAP (report: G-REVIEW-BAR): no Select component. */
function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <span className="review-field">
      <Label htmlFor={id}>{label}</Label>
      {children(id)}
    </span>
  );
}

function ScenarioSelect<K extends Exclude<keyof Scenarios, "signUpOpen">>({
  code,
  name,
  scenario,
}: {
  code: string;
  name: string;
  scenario: K;
}) {
  const demo = useDemo();
  const options = scenarioOptions[scenario];
  return (
    <Field label={`${code} ${name}`}>
      {(id) => (
        <select
          id={id}
          className="input"
          value={String(demo.scenarios[scenario])}
          onChange={(event) => {
            const picked = options.find((option) => String(option.value) === event.target.value);
            if (picked) demo.setScenario(scenario, picked.value);
          }}
        >
          {options.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

const motionQuery = "(prefers-reduced-motion: reduce)";

/** The window's width and the reduced-motion setting, shown under P11. */
const useView = () => {
  const read = () => ({
    width: window.innerWidth,
    reducedMotion: window.matchMedia(motionQuery).matches,
  });
  const [view, setView] = useState(read);
  useEffect(() => {
    const list = window.matchMedia(motionQuery);
    const update = () => setView(read());
    list.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      list.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return view;
};

/**
 * The review bar (prompt rule 5): screens, account, the state guide, theme and every scenario
 * control, kept apart from the product's own navigation. The review engine adds its controls
 * (Clickable / Comment, Presentation, Threads) at the end of this bar.
 */
export function ReviewBar({
  current,
  guide,
  onGuide,
  onReload,
  onReset,
}: {
  current: ScreenId;
  guide: StateGuide | null;
  onGuide: (entry: StateGuide) => void;
  onReload: () => void;
  onReset: () => void;
}) {
  const demo = useDemo();
  const signUpId = useId();
  const view = useView();
  const changed = (Object.keys(defaultScenarios) as (keyof Scenarios)[]).filter(
    (key) => demo.scenarios[key] !== defaultScenarios[key],
  ).length;

  return (
    <div className="doc-toolbar">
      <p className="review-label">
        <strong>Prototype</strong>
        <span>Simulation. Nothing is sent; data lives in this page.</span>
      </p>
      <nav className="screen-nav" aria-label="Prototype screens">
        {screens.map((screen) => (
          <a
            key={screen.id}
            href={`#${screen.id}`}
            aria-current={screen.id === current ? "page" : undefined}
          >
            {screen.id} {screen.short}
          </a>
        ))}
      </nav>
      <div className="review-controls">
        <Button onClick={onReload}>Reload screen</Button>
        <Button onClick={onReset}>Reset prototype</Button>
        <ThemeToggle value={demo.theme} onValueChange={demo.setTheme} />
        <span className="review-clock">Demo clock: {demoNowText}</span>
      </div>
      {/* Outside the folded panel, since it says what to click. The live region stays on the page
          (hidden while empty), so screen readers announce each new hint. */}
      <p role="status" className={guide ? "review-guide" : "sr-only"}>
        {guide ? (
          <>
            <strong>
              {guide.id} {guide.label}:
            </strong>{" "}
            {guide.hint}
          </>
        ) : null}
      </p>
      {/* Folded by default, so the bar stays short on a phone (owner, 2026-10-27). */}
      <details className="review-scenarios">
        <summary>
          Account, states and scenarios · {demo.owner?.id ?? "K1"}
          {changed > 0 ? ` · ${changed} changed from the default` : ""}
        </summary>
        <div className="review-scenario-grid">
          <Field label="Account">
            {(id) => (
              <select
                id={id}
                className="input"
                value={demo.owner?.id ?? "K1"}
                onChange={(event) => demo.switchAccount(event.target.value as AccountId)}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Go to state">
            {(id) => (
              <select
                id={id}
                className="input"
                // Back to the prompt after each choice, so the same state can be chosen again.
                value=""
                onChange={(event) => {
                  const entry = stateGuide.find((state) => state.id === event.target.value);
                  if (entry) onGuide(entry);
                }}
              >
                <option value="">Choose a state…</option>
                {screens.map((screen) => (
                  <optgroup key={screen.id} label={`${screen.id} ${screen.short}`}>
                    {stateGuide
                      .filter((state) => state.id.startsWith(`${screen.id}.`))
                      .map((state) => (
                        <option
                          key={state.id}
                          value={state.id}
                          disabled={state.outside ?? state.superseded !== undefined}
                        >
                          {state.id} {state.label}
                          {state.outside ? " (not in the prototype)" : ""}
                          {state.superseded ? ` (replaced by ${state.superseded})` : ""}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            )}
          </Field>
          <p className="review-note">
            Pick a state to set the scenario controls for it. Alt+Shift+R reloads the screen, also
            from inside a dialog.
          </p>
        </div>
        <div className="review-scenario-grid">
          <span className="review-field review-check">
            <Checkbox
              id={signUpId}
              checked={demo.scenarios.signUpOpen}
              onCheckedChange={(open) => demo.setScenario("signUpOpen", open)}
            />
            <Label htmlFor={signUpId}>P01 Sign-up open</Label>
          </span>
          <ScenarioSelect code="P02" name="Sign-in result" scenario="signIn" />
          <ScenarioSelect code="P03" name="Sign-up result" scenario="signUp" />
          {demo.owner ? (
            <ScenarioSelect code="P04" name="Session" scenario="session" />
          ) : (
            <Field label="P04 Session">
              {(id) => (
                <select id={id} className="input" disabled>
                  <option>none (K1 guest)</option>
                </select>
              )}
            </Field>
          )}
          <ScenarioSelect code="P05" name="List load (when the page opens)" scenario="load" />
          <ScenarioSelect code="P06" name="Server answer to changes" scenario="changes" />
          <ScenarioSelect code="P06" name="Server delay" scenario="delay" />
          <ScenarioSelect code="P07" name="Sign-out" scenario="signOut" />
          <Field label="P08 Replace the list of the signed-in account">
            {(id) => (
              <select
                id={id}
                className="input"
                value=""
                disabled={!demo.owner}
                onChange={(event) => {
                  if (event.target.value) demo.setDataset(event.target.value as Dataset);
                }}
              >
                <option value="">{demo.owner ? "Choose a data set…" : "Sign in first"}</option>
                {datasetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <ScenarioSelect code="P09" name="Races (once)" scenario="race" />
          <ScenarioSelect code="P12" name="Page load" scenario="page" />
          <div className="review-field">
            <span className="review-field-label">P11 View</span>
            <span className="review-row">
              {widths.map((width) => (
                <Button
                  key={width}
                  onClick={() =>
                    window.open(
                      window.location.href,
                      `taskly-prototype-${width}`,
                      `popup,width=${width},height=900`,
                    )
                  }
                >
                  Open at {width} px
                </Button>
              ))}
            </span>
            <span className="review-note">
              A new window starts the demo over (comments are shared). Now {view.width} px wide.
              Reduced motion: {view.reducedMotion ? "on" : "off"} (set in the system or in
              DevTools). Language: English only (L04).
            </span>
          </div>
        </div>
      </details>
    </div>
  );
}
