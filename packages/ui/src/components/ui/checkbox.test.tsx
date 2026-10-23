// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Checkbox } from "./checkbox";

afterEach(cleanup);

describe("Checkbox", () => {
  it("toggles and reports a boolean", () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Paint the ceiling" onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole("checkbox", { name: "Paint the ceiling" });
    expect(box.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(box);
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
    expect(box.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(box);
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);
  });

  it("works uncontrolled without a handler and accepts classes", () => {
    render(<Checkbox aria-label="Done" defaultChecked className="extra" />);
    const box = screen.getByRole("checkbox", { name: "Done" });
    expect(box.getAttribute("aria-checked")).toBe("true");
    expect(box.className).toContain("extra");
    fireEvent.click(box);
    expect(box.getAttribute("aria-checked")).toBe("false");
  });
});
