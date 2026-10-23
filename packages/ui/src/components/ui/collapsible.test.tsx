// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleIndicator,
  CollapsibleTrigger,
} from "./collapsible";

afterEach(cleanup);

describe("Collapsible", () => {
  it("opens and closes its content", () => {
    render(
      <Collapsible>
        <CollapsibleTrigger className="extra">
          <CollapsibleIndicator className="indicator" />
          Details
        </CollapsibleTrigger>
        <CollapsibleContent className="content">Description, minimum, maximum</CollapsibleContent>
      </Collapsible>,
    );
    const trigger = screen.getByRole("button", { name: "Details" });
    expect(trigger.className).toContain("group/trigger");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Description, minimum, maximum").className).toContain(
      "collapsible-content",
    );
  });
});
