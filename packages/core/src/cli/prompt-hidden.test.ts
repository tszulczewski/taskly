import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { type HiddenInput, PromptCancelledError, readHidden } from "./prompt-hidden";

function fakeTerminal() {
  const log: string[] = [];
  const input = Object.assign(new EventEmitter(), {
    setRawMode: vi.fn((on: boolean) => log.push(`raw:${on}`)),
    setEncoding: vi.fn(),
    resume: vi.fn(),
    pause: vi.fn(() => log.push("pause")),
  });
  const output = { write: vi.fn((text: string) => log.push(`write:${text}`)) };
  const type = (...chunks: string[]) => chunks.forEach((chunk) => input.emit("data", chunk));
  const ask = () => readHidden(input as unknown as HiddenInput, output, "Password: ");
  return { input, output, log, type, ask };
}

describe("readHidden", () => {
  it("turns echo off before asking, returns the line and restores the terminal", async () => {
    const t = fakeTerminal();
    const answer = t.ask();
    t.type("correct-horse", "-battery\r");

    await expect(answer).resolves.toBe("correct-horse-battery");
    expect(t.log).toStrictEqual(["raw:true", "write:Password: ", "raw:false", "pause", "write:\n"]);
    expect(t.input.setEncoding).toHaveBeenCalledWith("utf8");
    expect(t.input.resume).toHaveBeenCalledOnce();
    expect(t.input.listenerCount("data")).toBe(0);
    expect(t.input.listenerCount("end")).toBe(0);
  });

  it("never writes what was typed", async () => {
    const t = fakeTerminal();
    const answer = t.ask();
    t.type("s3cret-pass\r");

    await answer;
    expect(t.output.write.mock.calls.flat().join("")).not.toContain("s3cret");
  });

  it("accepts a line feed as Enter and ignores what follows it", async () => {
    const t = fakeTerminal();
    const answer = t.ask();
    t.type("first-line\nsecond-line\r");

    await expect(answer).resolves.toBe("first-line");
  });

  it("erases with Backspace or Ctrl+H, by character, and on an empty line", async () => {
    const t = fakeTerminal();
    const answer = t.ask();
    t.type("\x7f", "zażółć", "\x7f\x7f", "\b", "x", "🔑", "\x7f", "y\r");

    await expect(answer).resolves.toBe("zażxy");
  });

  it("drops other control characters", async () => {
    const t = fakeTerminal();
    const answer = t.ask();
    t.type("a\tb\x1bc\r");

    await expect(answer).resolves.toBe("abc");
  });

  it.each([
    ["Ctrl+C", "\x03"],
    ["Ctrl+D", "\x04"],
  ])("cancels on %s and restores the terminal", async (_key, char) => {
    const t = fakeTerminal();
    const answer = t.ask();
    t.type(`half${char}rest\r`);

    await expect(answer).rejects.toBeInstanceOf(PromptCancelledError);
    expect(t.log.slice(-3)).toStrictEqual(["raw:false", "pause", "write:\n"]);
    expect(t.input.listenerCount("data")).toBe(0);
  });

  it("cancels when the input closes", async () => {
    const t = fakeTerminal();
    const answer = t.ask();
    t.type("partial");
    t.input.emit("end");

    await expect(answer).rejects.toThrow("Prompt cancelled");
    expect(t.input.setRawMode).toHaveBeenLastCalledWith(false);
    expect(t.input.listenerCount("end")).toBe(0);
  });
});
