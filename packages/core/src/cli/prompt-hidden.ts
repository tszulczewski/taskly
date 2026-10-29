import type { ReadStream } from "node:tty";

export type HiddenInput = Pick<
  ReadStream,
  "setRawMode" | "setEncoding" | "on" | "off" | "resume" | "pause"
>;
export type PromptOutput = { write(text: string): unknown };

export class PromptCancelledError extends Error {
  constructor() {
    super("Prompt cancelled");
  }
}

const CTRL_C = "\x03";
const CTRL_D = "\x04";
const BACKSPACES = new Set(["\x7f", "\b"]);
const ENTERS = new Set(["\r", "\n"]);

/**
 * Reads one line from a terminal without echoing it. Raw mode turns off the terminal's own
 * echo, and nothing typed is written back. Ctrl+C, Ctrl+D or a closed input cancel.
 */
export function readHidden(
  input: HiddenInput,
  output: PromptOutput,
  question: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const chars: string[] = [];

    const finish = (error?: Error) => {
      input.off("data", onData);
      input.off("end", onEnd);
      input.setRawMode(false);
      input.pause();
      output.write("\n");
      if (error) reject(error);
      else resolve(chars.join(""));
    };
    const onEnd = () => finish(new PromptCancelledError());
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (ENTERS.has(char)) return finish();
        if (char === CTRL_C || char === CTRL_D) return finish(new PromptCancelledError());
        if (BACKSPACES.has(char)) chars.pop();
        // Other control characters (escape sequences, tabs) are never part of a password.
        else if (char >= " ") chars.push(char);
      }
    };

    // Raw mode first: a key pressed after the question is visible must not be echoed.
    input.setRawMode(true);
    input.setEncoding("utf8");
    input.on("data", onData);
    input.on("end", onEnd);
    input.resume();
    output.write(question);
  });
}
