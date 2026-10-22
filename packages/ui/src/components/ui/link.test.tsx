// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Link } from "./link";

afterEach(cleanup);

describe("Link", () => {
  it("renders an underlined anchor", () => {
    render(<Link href="/sign-up">Create an account</Link>);
    const link = screen.getByRole("link", { name: "Create an account" });
    expect(link.tagName).toBe("A");
    expect(link.className).toContain("underline");
  });

  it("styles its child with asChild", () => {
    render(
      <Link asChild>
        <a href="/sign-in" data-router="yes">
          Sign in
        </a>
      </Link>,
    );
    const link = screen.getByRole("link", { name: "Sign in" });
    expect(link.dataset.router).toBe("yes");
    expect(link.dataset.slot).toBe("link");
  });
});
