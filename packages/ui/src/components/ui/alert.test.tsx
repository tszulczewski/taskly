// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Alert } from "./alert";

afterEach(cleanup);

describe("Alert", () => {
  it("announces a title, a message and an action", () => {
    render(
      <Alert title="Could not load tasks." action={<button type="button">Try again</button>}>
        Check your connection and try again.
      </Alert>,
    );
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Could not load tasks.");
    expect(alert.textContent).toContain("Check your connection");
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("can hold only a title, in the danger colour", () => {
    render(<Alert title="Wrong email or password." />);
    const alert = screen.getByRole("alert");
    expect(alert.children).toHaveLength(1);
    expect(alert.firstElementChild?.className).toContain("text-danger");
  });
});
