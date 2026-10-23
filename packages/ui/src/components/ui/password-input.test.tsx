// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PasswordInput } from "./password-input";

afterEach(cleanup);

function field() {
  return document.querySelector("input") as HTMLInputElement;
}

describe("PasswordInput", () => {
  it("starts hidden and toggles visibility with aria-pressed", () => {
    render(<PasswordInput aria-label="Password" />);
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(field().type).toBe("password");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(toggle.getAttribute("aria-controls")).toBe(field().id);
    fireEvent.click(toggle);
    expect(field().type).toBe("text");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(toggle);
    expect(field().type).toBe("password");
  });

  it("hides the password again when the form is submitted", () => {
    const { unmount } = render(
      <form onSubmit={(event) => event.preventDefault()}>
        <PasswordInput id="password" aria-label="Password" toggleLabel="Pokaż hasło" />
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Pokaż hasło" }));
    expect(field().type).toBe("text");
    expect(field().id).toBe("password");
    fireEvent.submit(field().form as HTMLFormElement);
    expect(field().type).toBe("password");
    unmount();
  });

  it("disables the toggle together with the field", () => {
    render(<PasswordInput aria-label="Password" disabled />);
    expect(screen.getByRole("button", { name: "Show password" }).hasAttribute("disabled")).toBe(
      true,
    );
  });
});
