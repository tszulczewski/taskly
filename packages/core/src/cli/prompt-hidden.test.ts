import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import {
  type HiddenInput,
  PromptCancelledError,
  UnsupportedKeyError,
  readHidden,
} from "./prompt-hidden";

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

  it("keeps spaces, symbols and non-Latin characters", async () => {
    const t = fakeTerminal();
    const answer = t.ask();
    t.type("pass word ~!@#$%^&*()_+-={}[]|\\:;\"'<>,.?/ ąę ¡¿ 密码\r");

    await expect(answer).resolves.toBe("pass word ~!@#$%^&*()_+-={}[]|\\:;\"'<>,.?/ ąę ¡¿ 密码");
  });

  // Discarding these would store a password the user did not mean: `abc`, Left, `X` looks like
  // `abXc` but would become `abcX`, and the same keys at both prompts pass the mismatch check.
  it.each([
    ["Left", ["abc\x1b[DX\r"]],
    ["Delete", ["abc\x1b[3~\r"]],
    ["Home (CSI)", ["abc\x1b[H\r"]],
    ["Home (SS3)", ["abc\x1bOH\r"]],
    ["ESC and [D in separate chunks", ["abc", "\x1b", "[D", "\r"]],
    ["Alt+x", ["abc\x1bx\r"]],
    ["Tab", ["abc\tdef\r"]],
    ["Ctrl+U", ["abc\x15xyz\r"]],
    ["Ctrl+W", ["abc\x17xyz\r"]],
    ["an 8-bit CSI", ["abc\x9bD\r"]],
  ])("rejects %s and restores the terminal", async (_key, chunks) => {
    const t = fakeTerminal();
    const answer = t.ask();
    t.type(...chunks);

    await expect(answer).rejects.toBeInstanceOf(UnsupportedKeyError);
    expect(t.log).toStrictEqual(["raw:true", "write:Password: ", "raw:false", "pause", "write:\n"]);
    expect(t.input.listenerCount("data")).toBe(0);
    expect(t.input.listenerCount("end")).toBe(0);
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
