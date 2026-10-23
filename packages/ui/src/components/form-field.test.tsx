// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FormField } from "./form-field";
import { Input } from "./ui/input";

afterEach(cleanup);

describe("FormField", () => {
  it("wires label, hint and required to the control", () => {
    render(
      <FormField label="Password" hint="At least 10 characters">
        {(field) => <Input {...field} />}
      </FormField>,
    );
    const input = screen.getByLabelText("Password");
    expect(input.getAttribute("aria-required")).toBe("true");
    expect(input.hasAttribute("aria-invalid")).toBe(false);
    const hintId = input.getAttribute("aria-describedby");
    expect(document.getElementById(String(hintId))?.textContent).toBe("At least 10 characters");
  });

  it("marks the control invalid and describes it by hint and error", () => {
    render(
      <FormField
        id="max"
        label="Maximum"
        hint="In złoty"
        error="Maximum must be at least the minimum."
      >
        {(field) => <Input {...field} />}
      </FormField>,
    );
    const input = screen.getByLabelText("Maximum");
    expect(input.id).toBe("max");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe("max-hint max-error");
  });

  it("says optional in words and does not mark the control required", () => {
    render(
      <FormField label="Description" optional optionalText="(opcjonalnie)" error={false}>
        {(field) => <Input {...field} />}
      </FormField>,
    );
    expect(screen.getByText("(opcjonalnie)")).toBeTruthy();
    const input = screen.getByRole("textbox");
    expect(input.hasAttribute("aria-required")).toBe(false);
    expect(input.hasAttribute("aria-describedby")).toBe(false);
  });

  it("uses the default optional marker", () => {
    render(
      <FormField label="Description" optional error={null}>
        {(field) => <Input {...field} />}
      </FormField>,
    );
    expect(screen.getByText("(optional)")).toBeTruthy();
  });
});
