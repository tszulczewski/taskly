// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RadioGroup, RadioGroupItem, RadioGroupSegment } from "./radio-group";

afterEach(cleanup);

describe("RadioGroup", () => {
  it("lists round options and selects one", () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroup aria-label="Colour" defaultValue="blue" onValueChange={onValueChange}>
        <RadioGroupItem value="blue" aria-label="Blue" />
        <RadioGroupItem value="ochre" aria-label="Ochre" className="extra" />
      </RadioGroup>,
    );
    expect(screen.getByRole("radiogroup", { name: "Colour" }).dataset.variant).toBe("list");
    const ochre = screen.getByRole("radio", { name: "Ochre" });
    expect(ochre.className).toContain("extra");
    fireEvent.click(ochre);
    expect(onValueChange).toHaveBeenCalledWith("ochre");
    expect(ochre.getAttribute("aria-checked")).toBe("true");
  });

  it("renders segments side by side", () => {
    render(
      <RadioGroup aria-label="Theme" variant="segmented" defaultValue="dark">
        <RadioGroupSegment value="dark">Dark</RadioGroupSegment>
        <RadioGroupSegment value="light" className="extra">
          Light
        </RadioGroupSegment>
      </RadioGroup>,
    );
    expect(screen.getByRole("radiogroup", { name: "Theme" }).dataset.variant).toBe("segmented");
    expect(screen.getByRole("radio", { name: "Dark" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "Light" }).className).toContain("extra");
  });
});
