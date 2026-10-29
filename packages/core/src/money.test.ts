import { describe, expect, it } from "vitest";
import { MAX_ESTIMATE_GROSZE, parsePlnToGrosze } from "./money";

describe("MAX_ESTIMATE_GROSZE", () => {
  it("is 10 000 000.00 PLN", () => {
    expect(MAX_ESTIMATE_GROSZE).toBe(10_000_000 * 100);
  });
});

describe("parsePlnToGrosze", () => {
  it.each([
    // Edge Cases, spec E01
    ["12,5", 1250],
    ["12.50", 1250],
    ["1 500", 150000],
    // Contract examples
    ["1500", 150000],
    ["1500.5", 150050],
    ["1 500,50", 150050],
    // Boundaries and formats
    ["0", 0],
    ["0,01", 1],
    ["0,5", 50],
    ["007", 700],
    ["10 000 000", MAX_ESTIMATE_GROSZE],
    ["10000000,01", MAX_ESTIMATE_GROSZE + 1],
    ["1\u00a0500,50", 150050],
    ["1\u202f500,50", 150050],
    ["1 000\u00a0000", 100000000],
    ["999", 99900],
    ["  1 500 ", 150000],
    ["\t12,50\n", 1250],
    ["\u00a012,50\u00a0", 1250],
  ])("reads %j as %i grosze", (text, grosze) => {
    expect(parsePlnToGrosze(text)).toBe(grosze);
  });

  it.each([
    // Edge Cases, spec E01
    "-5",
    "1e3",
    "12.345",
    // Not an amount
    "",
    "   ",
    "abc",
    "12 zł",
    "+5",
    "5-",
    ",5",
    ".5",
    "12,",
    "12.",
    "1,500", // a comma is always decimal: three decimals
    "1.500,50", // a dot is never a thousands separator
    "1,5,0",
    "12,5.0",
    "Infinity",
    "NaN",
    "0x10",
    "１２", // full-width digits
    "٣", // Arabic-Indic digit
    // Malformed grouping
    "15 00",
    "1 5000",
    "1500 000",
    "1  500",
    "0 500",
    "1 500 00",
    " 1 500 ,50",
    "1\t500",
    "1_500",
    "1'500",
  ])("rejects %j", (text) => {
    expect(parsePlnToGrosze(text)).toBeNull();
  });

  it("rejects amounts whose grosze are not an exact integer", () => {
    expect(parsePlnToGrosze("90071992547409,91")).toBe(Number.MAX_SAFE_INTEGER);
    expect(parsePlnToGrosze("90071992547409,92")).toBeNull();
    expect(parsePlnToGrosze("9".repeat(400))).toBeNull();
  });
});
