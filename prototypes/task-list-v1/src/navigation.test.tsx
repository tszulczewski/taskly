import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
// The engine only defines itself on import; it starts when App calls __PROTOTYPE_START__.
import "../silnik/comments.js";
import "../silnik/prototype.js";
import { App } from "./app";
import { screens } from "./screens";
import { DemoProvider } from "./store";

/**
 * Navigation between the screens of the map, on the whole review page with the real review engine
 * (`silnik/prototype.js`). One page for all tests, like a reviewer's tab; each test starts with
 * "Reset prototype" and a server that answers at once.
 */

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
Element.prototype.scrollIntoView = vi.fn();
window.scrollTo = vi.fn();
window.matchMedia = vi.fn(
  () =>
    ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList,
);

const current = () => document.querySelector(".screen.is-current")?.id;
const section = (id: string) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`No section ${id}.`);
  return within(element);
};
const bar = () => {
  const element = document.querySelector<HTMLElement>(".doc-toolbar");
  if (!element) throw new Error("No review bar.");
  return within(element);
};
const choose = (label: string | RegExp, value: string) =>
  fireEvent.change(bar().getByLabelText(label), { target: { value } });
const goToState = (id: string) => act(() => choose("Go to state", id));

const signIn = (email: string, password: string) => {
  const s01 = section("s01");
  fireEvent.change(s01.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(s01.getByLabelText("Password"), { target: { value: password } });
  fireEvent.click(s01.getByRole("button", { name: "Sign in" }));
};

beforeAll(() => {
  document.documentElement.dataset.prototypeId = "task-list-v1-test";
  document.documentElement.dataset.startScreen = "s01";
  render(
    <DemoProvider>
      <App />
    </DemoProvider>,
  );
});

beforeEach(() => {
  fireEvent.click(bar().getByRole("button", { name: "Reset prototype" }));
  choose("P06 Server delay", "0");
});

describe("prototype navigation", () => {
  it("starts on s01 and marks it in the screen list", () => {
    expect(current()).toBe("s01");
    expect(bar().getByRole("link", { name: "s01 Sign in" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("reaches every screen of the map from the screen list", () => {
    for (const { id, short } of screens) {
      fireEvent.click(bar().getByRole("link", { name: `${id} ${short}` }));
      expect(current()).toBe(id);
      expect(bar().getByRole("link", { name: `${id} ${short}` })).toHaveAttribute(
        "aria-current",
        "page",
      );
    }
  });

  it("gives every screen a note with stories, simulation and open points", () => {
    for (const { id } of screens) {
      const notes = section(id);
      expect(notes.getByText("Stories:")).toBeInTheDocument();
      expect(notes.getByText("Simulated:")).toBeInTheDocument();
      expect(notes.getByText("Not decided here:")).toBeInTheDocument();
    }
  });

  it("stops a guest at the task list (s04.1) and sends them to sign-in", () => {
    fireEvent.click(bar().getByRole("link", { name: "s04 Task list" }));
    const s04 = section("s04");
    expect(s04.getByRole("heading", { name: "Not signed in" })).toBeInTheDocument();
    fireEvent.click(s04.getByRole("button", { name: "Go to sign-in" }));
    expect(current()).toBe("s01");
  });

  it("goes back with the engine's Back button", () => {
    fireEvent.click(bar().getByRole("link", { name: "s03 Sign-up closed" }));
    fireEvent.click(bar().getByRole("link", { name: "s05 Task opened" }));
    fireEvent.click(screen.getByRole("button", { name: "← Back" }));
    expect(current()).toBe("s03");
  });

  it("opens a screen from a #hash link", async () => {
    window.location.hash = "#s03";
    await waitFor(() => expect(current()).toBe("s03"));
  });

  it("signs in to the task list, then signs out to sign-in (#24-DW1)", async () => {
    signIn("marta@taskly.test", "remont-demo-2026");
    await waitFor(() => expect(current()).toBe("s04"));
    const s04 = section("s04");
    expect(await s04.findByRole("heading", { name: "My renovation" })).toBeInTheDocument();
    expect(s04.getByText("Curtain rods")).toBeInTheDocument();
    // s01.9: a signed-in person gets a gate on the sign-in page.
    expect(section("s01").getByRole("heading", { name: /Signed in as Marta/ })).toBeVisible();

    fireEvent.click(s04.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(current()).toBe("s01"));
    expect(section("s01").getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("stays on sign-in when the password is wrong (s01.6)", async () => {
    signIn("marta@taskly.test", "wrong-password");
    expect(await section("s01").findByRole("alert")).toHaveTextContent(
      "Email or password is incorrect.",
    );
    expect(current()).toBe("s01");
  });

  it("leads from sign-in to sign-up when sign-up is open, then to the empty list (s02.11)", async () => {
    expect(section("s01").queryByRole("link", { name: "Create an account" })).toBeNull();
    fireEvent.click(bar().getByLabelText("P01 Sign-up open"));
    fireEvent.click(section("s01").getByRole("link", { name: "Create an account" }));
    expect(current()).toBe("s02");

    const s02 = section("s02");
    fireEvent.change(s02.getByLabelText("Name"), { target: { value: "Jan Kowal" } });
    fireEvent.change(s02.getByLabelText("Email"), { target: { value: "jan@taskly.test" } });
    fireEvent.change(s02.getByLabelText("Password"), { target: { value: "pierwszy-dom-01" } });
    fireEvent.click(s02.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(current()).toBe("s04"));
    expect(await section("s04").findByText("No tasks yet.")).toBeInTheDocument();
    expect(bar().getByLabelText("Account")).toHaveValue("K3");
  });

  it("sends sign-up to the closed page while sign-up is closed, and back to sign-in", () => {
    fireEvent.click(bar().getByRole("link", { name: "s02 Sign up" }));
    fireEvent.click(section("s02").getByRole("button", { name: "Go to s03" }));
    expect(current()).toBe("s03");
    fireEvent.click(section("s03").getByRole("link", { name: "Sign in" }));
    expect(current()).toBe("s01");
  });

  it("opens each state of the guide on its screen", () => {
    for (const [state, screenId] of [
      ["s01.6", "s01"],
      ["s02.5", "s02"],
      ["s03.1", "s03"],
      ["s04.6", "s04"],
      ["s05.2", "s05"],
      ["s06.1", "s06"],
      ["s07.8", "s07"],
      ["s08.2", "s08"],
    ] as const) {
      goToState(state);
      expect(current()).toBe(screenId);
      expect(bar().getByRole("status")).toHaveTextContent(state);
    }
  });

  it("shows a task with subtasks with their sum and the unestimated count (s04.34)", async () => {
    goToState("s04.34");
    const s04 = section("s04");
    expect(await s04.findByText(/^700–1\s400 zł$/)).toBeInTheDocument();
    expect(s04.getByText("3 subtasks without an estimate")).toBeInTheDocument();
  });

  it("adds a subtask's amounts to its task's sum (s07.11)", async () => {
    goToState("s07.11");
    const s07 = section("s07");
    const title = await s07.findByLabelText("New subtask");
    const form = within(title.closest("form") as HTMLElement);
    fireEvent.change(title, { target: { value: "Sockets" } });
    fireEvent.change(form.getByLabelText("Amount"), { target: { value: "300" } });
    fireEvent.change(form.getByLabelText(/^up to/), { target: { value: "400" } });
    fireEvent.click(form.getByRole("button", { name: "Add" }));
    expect(await s07.findByText(/^1\s000–1\s800 zł$/)).toBeInTheDocument();
  });

  it("opens a closed description that has an error (s04.33)", async () => {
    goToState("s04.33");
    const s04 = section("s04");
    const title = await s04.findByLabelText("New task");
    const form = within(title.closest("form") as HTMLElement);
    fireEvent.change(title, { target: { value: "Sow the rest of the lawn again" } });
    fireEvent.click(form.getByRole("button", { name: "Description" }));
    fireEvent.change(form.getByLabelText(/^Description/), { target: { value: "x".repeat(2001) } });
    fireEvent.click(form.getByRole("button", { name: "Description" }));
    fireEvent.click(form.getByRole("button", { name: "Add" }));
    expect(await form.findByText("Enter at most 2 000 characters.")).toBeInTheDocument();
    expect(form.getByRole("button", { name: "Description" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("refuses an estimate save when the task got a subtask elsewhere (s06.12)", async () => {
    goToState("s06.12");
    const s06 = section("s06");
    const form = within(await s06.findByRole("form", { name: "Edit “Curtain rods”" }));
    fireEvent.change(form.getByLabelText("Amount"), { target: { value: "900" } });
    fireEvent.click(form.getByRole("button", { name: "Save" }));
    expect(
      await form.findByText("A task with subtasks takes its estimate from them"),
    ).toBeInTheDocument();
    expect(await form.findByText("Sum of subtasks:")).toBeInTheDocument();
  });

  it("lands on sign-in with the expiry notice when the session expires (s01.11)", async () => {
    goToState("s01.11");
    await waitFor(() => expect(current()).toBe("s01"));
    expect(
      await section("s01").findByText("Your session has expired. Sign in again."),
    ).toBeInTheDocument();
    expect(bar().getByLabelText("Account")).toHaveValue("K1");
  });

  it("switches accounts from the review bar without leaving the screen", async () => {
    fireEvent.click(bar().getByRole("link", { name: "s04 Task list" }));
    choose("Account", "K4");
    expect(await section("s04").findByText("Paint the hallway")).toBeInTheDocument();
    expect(current()).toBe("s04");
    choose("Account", "K1");
    expect(section("s04").getByRole("heading", { name: "Not signed in" })).toBeInTheDocument();
  });
});
