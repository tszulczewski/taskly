// @vitest-environment jsdom
import { type QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/api-client";
import { QueryProvider } from "./query-provider";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function Probe() {
  const client = useQueryClient();
  return <p>{String(client.getDefaultOptions().queries?.staleTime)}</p>;
}

function Capture({ onClient }: { onClient: (client: QueryClient) => void }) {
  const client = useQueryClient();
  useEffect(() => onClient(client), [client, onClient]);
  return null;
}

let failQuery: (error: unknown) => void = () => {};
function Pending() {
  useQuery({
    queryKey: ["tasks"],
    queryFn: () =>
      new Promise((_, reject) => {
        failQuery = reject;
      }),
  });
  return null;
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

  it("on 401 drops the cache and goes to sign-in", async () => {
    let client: QueryClient | undefined;
    render(
      <QueryProvider>
        <Capture
          onClient={(value) => {
            client = value;
          }}
        />
        <Pending />
      </QueryProvider>,
    );
    act(() => client?.setQueryData(["other"], "cached"));
    failQuery(new ApiError(401, "unauthorized", "Unauthorized"));
    await waitFor(() => expect(router.replace).toHaveBeenCalledExactlyOnceWith("/sign-in"));
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(client?.getQueryData(["other"])).toBeUndefined();
  });
});
