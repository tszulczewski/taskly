import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { TaskItem, Theme } from "@taskly/ui";
import { demoAccounts, janAccount, listName, manyTasks, martaTasks, type Account } from "./data";
import { defaultScenarios, type Dataset, type Scenarios } from "./scenarios";

/** Everything the prototype remembers, in page memory only (nothing is stored or sent). */
interface DemoState {
  accounts: Account[];
  /** The signed-in account; null is K1, the guest. */
  sessionId: string | null;
  /** Why the last session ended: "expired" shows s01.11 on the sign-in page (L10). */
  sessionEnd: "signedOut" | "expired" | null;
  scenarios: Scenarios;
  theme: Theme;
}

const initialState = (): DemoState => ({
  accounts: demoAccounts(),
  sessionId: null,
  sessionEnd: null,
  scenarios: defaultScenarios,
  theme: "dark",
});

export type AccountId = "K1" | "K2" | "K3" | "K4";

export interface Demo extends DemoState {
  owner: Account | null;
  signIn: (email: string, password: string) => Account | null;
  /** Returns null when the email is already used (the spec's 422). */
  signUp: (name: string, email: string, password: string) => Account | null;
  signOut: () => void;
  /** P04's 401: no session any more, and the sign-in page says why. */
  expireSession: () => void;
  /** The review bar's account switch: signs in at once, without a form (review only). */
  switchAccount: (id: AccountId) => void;
  updateTasks: (accountId: string, change: (tasks: TaskItem[]) => TaskItem[]) => void;
  setScenario: <K extends keyof Scenarios>(key: K, value: Scenarios[K]) => void;
  setScenarios: (values: Partial<Scenarios>) => void;
  setDataset: (dataset: Dataset) => void;
  /** Puts the signed-in account's list back to its demo data (map, section 3). */
  restoreList: () => void;
  setTheme: (theme: Theme) => void;
  reset: () => void;
}

const DemoContext = createContext<Demo | null>(null);

const sameEmail = (left: string, right: string) =>
  left.trim().toLowerCase() === right.trim().toLowerCase();

const datasets: Record<Dataset, () => TaskItem[]> = {
  full: martaTasks,
  empty: () => [],
  many: manyTasks,
};

let nextAccount = 0;

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState);

  const demo = useMemo<Demo>(() => {
    const owner = state.accounts.find((account) => account.id === state.sessionId) ?? null;
    const signedIn = (account: Account) =>
      setState((current) => ({
        ...current,
        accounts: current.accounts.some((known) => known.id === account.id)
          ? current.accounts
          : [...current.accounts, account],
        sessionId: account.id,
        sessionEnd: null,
        scenarios: { ...current.scenarios, session: "valid" },
      }));
    return {
      ...state,
      owner,
      signIn: (email, password) => {
        const account = state.accounts.find(
          (candidate) => sameEmail(candidate.email, email) && candidate.password === password,
        );
        if (account) signedIn(account);
        return account ?? null;
      },
      signUp: (name, email, password) => {
        if (state.accounts.some((account) => sameEmail(account.email, email))) return null;
        nextAccount += 1;
        const account: Account = {
          id: sameEmail(email, "jan@taskly.test") ? "K3" : `new-${nextAccount}`,
          name: name.trim(),
          email: email.trim(),
          password,
          listName,
          tasks: [],
        };
        signedIn(account);
        return account;
      },
      signOut: () =>
        setState((current) => ({ ...current, sessionId: null, sessionEnd: "signedOut" })),
      expireSession: () =>
        setState((current) => ({
          ...current,
          sessionId: null,
          sessionEnd: "expired",
          scenarios: { ...current.scenarios, session: "valid" },
        })),
      switchAccount: (id) => {
        if (id === "K1") {
          setState((current) => ({ ...current, sessionId: null, sessionEnd: null }));
          return;
        }
        const account =
          state.accounts.find((known) => known.id === id) ?? (id === "K3" ? janAccount() : null);
        if (account) signedIn(account);
      },
      updateTasks: (accountId, change) =>
        setState((current) => ({
          ...current,
          accounts: current.accounts.map((account) =>
            account.id === accountId ? { ...account, tasks: change(account.tasks) } : account,
          ),
        })),
      setScenario: (key, value) =>
        setState((current) => ({ ...current, scenarios: { ...current.scenarios, [key]: value } })),
      setScenarios: (values) =>
        setState((current) => ({ ...current, scenarios: { ...current.scenarios, ...values } })),
      setDataset: (dataset) =>
        setState((current) => ({
          ...current,
          accounts: current.accounts.map((account) =>
            account.id === current.sessionId ? { ...account, tasks: datasets[dataset]() } : account,
          ),
        })),
      restoreList: () =>
        setState((current) => {
          const demoData = [...demoAccounts(), janAccount()];
          return {
            ...current,
            accounts: current.accounts.map((account) =>
              account.id === current.sessionId
                ? {
                    ...account,
                    tasks: demoData.find((known) => known.id === account.id)?.tasks ?? [],
                  }
                : account,
            ),
          };
        }),
      setTheme: (theme) => setState((current) => ({ ...current, theme })),
      reset: () => setState((current) => ({ ...initialState(), theme: current.theme })),
    };
  }, [state]);

  return <DemoContext.Provider value={demo}>{children}</DemoContext.Provider>;
}

export function useDemo(): Demo {
  const demo = useContext(DemoContext);
  if (!demo) throw new Error("useDemo needs DemoProvider.");
  return demo;
}
