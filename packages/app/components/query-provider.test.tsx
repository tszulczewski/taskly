// @vitest-environment jsdom
import { useQueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QueryProvider } from "./query-provider";

function Probe() {
  const client = useQueryClient();
  return <p>{String(client.getDefaultOptions().queries?.staleTime)}</p>;
}

describe("QueryProvider", () => {
  it("provides a query client with project defaults", () => {
    render(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    );
    expect(screen.getByText("30000")).toBeTruthy();
  });
});
