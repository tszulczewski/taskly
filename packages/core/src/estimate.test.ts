import { describe, expect, it } from "vitest";
import { estimateFromAmounts, rollUpEstimate } from "./estimate";
import { MAX_ESTIMATE_GROSZE } from "./money";
import { estimateViewSchema } from "./schemas";

const notAnAmount = "Enter an amount like 1 500,50";
const upToBelowAmount = "“Up to” must not be less than the amount.";
const overCap = "Enter at most 10 000 000 zł";

const range = (minGrosze: number, maxGrosze: number) => ({ minGrosze, maxGrosze });

describe("estimateFromAmounts", () => {
  it("returns no estimate when both fields are empty or blank", () => {
    expect(estimateFromAmounts("", "")).toEqual({ ok: true, estimate: null });
    expect(estimateFromAmounts("  ", "\t")).toEqual({ ok: true, estimate: null });
  });

  it("reads only “Amount” as an exact price", () => {
    expect(estimateFromAmounts("500", "")).toEqual({ ok: true, estimate: range(50000, 50000) });
  });

  it("reads only “up to” as an exact price", () => {
    expect(estimateFromAmounts(" ", "12,50")).toEqual({ ok: true, estimate: range(1250, 1250) });
  });

  it("reads both fields as a range", () => {
    expect(estimateFromAmounts("1 500", "2 000")).toEqual({
      ok: true,
      estimate: range(150000, 200000),
    });
  });

  it("reads two equal amounts as an exact price", () => {
    expect(estimateFromAmounts("500", "500,00")).toEqual({
      ok: true,
      estimate: range(50000, 50000),
    });
  });

  it("puts amount above “up to” on “up to”", () => {
    expect(estimateFromAmounts("2 000", "1 500")).toEqual({
      ok: false,
      fieldErrors: { upTo: upToBelowAmount },
    });
  });

  it.each(["-5", "1e3", "12.345", "abc"])(
    "puts the bad text %j on the field that holds it",
    (bad) => {
      expect(estimateFromAmounts(bad, "")).toEqual({
        ok: false,
        fieldErrors: { amount: notAnAmount },
      });
      expect(estimateFromAmounts("", bad)).toEqual({
        ok: false,
        fieldErrors: { upTo: notAnAmount },
      });
      expect(estimateFromAmounts("100", bad)).toEqual({
        ok: false,
        fieldErrors: { upTo: notAnAmount },
      });
      expect(estimateFromAmounts(bad, "100")).toEqual({
        ok: false,
        fieldErrors: { amount: notAnAmount },
      });
    },
  );

  it("reports both fields when both are bad, before comparing them", () => {
    expect(estimateFromAmounts("x", "10 000 000,01")).toEqual({
      ok: false,
      fieldErrors: { amount: notAnAmount, upTo: overCap },
    });
  });

  it("accepts 0 and the cap, and rejects one grosz over it on that field", () => {
    expect(estimateFromAmounts("0", "10 000 000")).toEqual({
      ok: true,
      estimate: range(0, MAX_ESTIMATE_GROSZE),
    });
    expect(estimateFromAmounts("10 000 000,01", "")).toEqual({
      ok: false,
      fieldErrors: { amount: overCap },
    });
    expect(estimateFromAmounts("1", "10000000,01")).toEqual({
      ok: false,
      fieldErrors: { upTo: overCap },
    });
  });

  it("gives an amount too large to hold exactly the format message", () => {
    expect(estimateFromAmounts("9".repeat(20), "")).toEqual({
      ok: false,
      fieldErrors: { amount: notAnAmount },
    });
  });
});

describe("rollUpEstimate", () => {
  it("returns the task's own figure when it has no subtasks", () => {
    expect(rollUpEstimate(range(100, 200), [])).toEqual({
      estimate: range(100, 200),
      unestimatedSubtasks: 0,
    });
    expect(rollUpEstimate(null, [])).toEqual({ estimate: null, unestimatedSubtasks: 0 });
  });

  it("sums the subtasks' minimums and maximums and ignores the own figure", () => {
    // #16 AC2: own 1 000–2 000, subtasks 300–400 and 500 → 800–900
    expect(
      rollUpEstimate(range(100000, 200000), [range(30000, 40000), range(50000, 50000)]),
    ).toEqual({ estimate: range(80000, 90000), unestimatedSubtasks: 0 });
  });

  it("leaves unestimated subtasks out of the sum and counts them", () => {
    expect(rollUpEstimate(null, [null, range(150, 200), null, range(400, 500)])).toEqual({
      estimate: range(550, 700),
      unestimatedSubtasks: 2,
    });
  });

  it("is null, with the count, when no subtask has an estimate, even with an own figure", () => {
    expect(rollUpEstimate(range(100, 200), [null, null])).toEqual({
      estimate: null,
      unestimatedSubtasks: 2,
    });
  });

  it("gives an exact price when the sums are equal", () => {
    expect(rollUpEstimate(null, [range(100, 100), range(250, 250)])).toEqual({
      estimate: range(350, 350),
      unestimatedSubtasks: 0,
    });
  });

  it("keeps a zero estimate as an estimate", () => {
    expect(rollUpEstimate(null, [range(0, 0)])).toEqual({
      estimate: range(0, 0),
      unestimatedSubtasks: 0,
    });
  });

  it("sums above MAX_ESTIMATE_GROSZE exactly, and the view schema accepts the sum", () => {
    const max = range(MAX_ESTIMATE_GROSZE, MAX_ESTIMATE_GROSZE);
    const { estimate } = rollUpEstimate(null, [max, max, range(1, 3)]);
    expect(estimate).toEqual(range(2 * MAX_ESTIMATE_GROSZE + 1, 2 * MAX_ESTIMATE_GROSZE + 3));
    expect(estimateViewSchema.parse(estimate)).toEqual(estimate);
  });
});
