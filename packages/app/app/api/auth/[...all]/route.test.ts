import { describe, expect, it, vi } from "vitest";

const GET = vi.fn(async () => new Response("get"));
const POST = vi.fn(async () => new Response("post"));
vi.mock("@taskly/core/server", () => ({ authRouteHandlers: () => ({ GET, POST }) }));

const route = await import("./route");

describe("auth route", () => {
  it("delegates GET and POST to Better Auth per request", async () => {
    const req = new Request("http://x/api/auth/ok");
    expect(await (await route.GET(req)).text()).toBe("get");
    expect(await (await route.POST(req)).text()).toBe("post");
    expect(GET).toHaveBeenCalledWith(req);
    expect(POST).toHaveBeenCalledWith(req);
  });
});
