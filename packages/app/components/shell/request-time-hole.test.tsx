import { renderToReadableStream } from "react-dom/server.edge";
import { describe, expect, it, vi } from "vitest";
import { RequestTimeHole } from "./request-time-hole";

const connection = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("next/server", () => ({ connection }));

describe("RequestTimeHole", () => {
  it("waits for the request, then renders nothing", async () => {
    const stream = await renderToReadableStream(<RequestTimeHole />);
    await stream.allReady;

    expect(connection).toHaveBeenCalledOnce();
    expect(await new Response(stream).text()).toBe("<!--$--><!--/$-->");
  });
});
