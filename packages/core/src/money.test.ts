import { describe, expect, it } from "vitest";
import { MAX_ESTIMATE_GROSZE, formatPln, formatPlnRange, parsePlnToGrosze } from "./money";

// Expected strings spell the two special characters out so a plain space cannot pass for them.
const NBSP = "\u00a0";
const EN_DASH = "\u2013";
const pln = (text: string) => text.replaceAll("_", NBSP).replaceAll("~", EN_DASH);
const codePoints = (text: string) => [...text].map((c) => c.codePointAt(0));

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

describe("formatPln", () => {
  it.each([
    [0, "0_zł"],
    [1, "0,01_zł"],
    [10, "0,10_zł"],
    [99, "0,99_zł"],
    [100, "1_zł"],
    [1250, "12,50_zł"],
    [99900, "999_zł"],
    [99999, "999,99_zł"],
    [100000, "1_000_zł"],
    [120000, "1_200_zł"],
    [120005, "1_200,05_zł"],
    [1234500, "12_345_zł"],
    [12345678, "123_456,78_zł"],
    [123456789, "1_234_567,89_zł"],
    [MAX_ESTIMATE_GROSZE, "10_000_000_zł"],
    // Sums are not capped (spec E01, Edge Cases)
    [MAX_ESTIMATE_GROSZE + 1, "10_000_000,01_zł"],
    [12345678901, "123_456_789,01_zł"],
    [Number.MAX_SAFE_INTEGER, "90_071_992_547_409,91_zł"],
  ])("formats %i grosze as %j", (grosze, text) => {
    expect(formatPln(grosze)).toBe(pln(text));
  });

  it("uses U+00A0 for grouping and before zł, never a plain or narrow space", () => {
    expect(codePoints(formatPln(123456789))).toEqual([
      0x31, 0xa0, 0x32, 0x33, 0x34, 0xa0, 0x35, 0x36, 0x37, 0x2c, 0x38, 0x39, 0xa0, 0x7a, 0x142,
    ]);
  });

  it("shows -0 as 0", () => {
    expect(formatPln(-0)).toBe(pln("0_zł"));
  });

  it.each([-1, 0.5, 12.345, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    "refuses %d, which is not an amount in grosze",
    (grosze) => {
      expect(() => formatPln(grosze)).toThrow(RangeError);
    },
  );
});

describe("formatPlnRange", () => {
  it.each([
    // Decision F11 and tokens rule 5
    [120000, 150000, "1_200~1_500_zł"],
    [0, 50000, "0~500_zł"],
    [18000, 30000, "180~300_zł"],
    [1200000, 1500000, "12_000~15_000_zł"],
    // Grosze only on the side that has them
    [120005, 150000, "1_200,05~1_500_zł"],
    [120000, 150050, "1_200~1_500,50_zł"],
    [1250, 1999, "12,50~19,99_zł"],
    [1, 2, "0,01~0,02_zł"],
    // Sums above the cap
    [MAX_ESTIMATE_GROSZE, 12345678901, "10_000_000~123_456_789,01_zł"],
  ])("formats %i–%i grosze as %j", (min, max, text) => {
    expect(formatPlnRange(min, max)).toBe(pln(text));
  });

  it.each([
    // R18: min = max is one amount, also for a sum
    [50000, "500_zł"],
    [1250, "12,50_zł"],
    [0, "0_zł"],
    [12345678901, "123_456_789,01_zł"],
  ])("shows one amount when min = max = %i", (grosze, text) => {
    expect(formatPlnRange(grosze, grosze)).toBe(pln(text));
    expect(formatPlnRange(grosze, grosze)).toBe(formatPln(grosze));
  });

  it("joins with one en dash without spaces and writes zł once", () => {
    expect(codePoints(formatPlnRange(120000, 150000))).toEqual([
      0x31, 0xa0, 0x32, 0x30, 0x30, 0x2013, 0x31, 0xa0, 0x35, 0x30, 0x30, 0xa0, 0x7a, 0x142,
    ]);
  });

  it("refuses an inverted range", () => {
    expect(() => formatPlnRange(150000, 120000)).toThrow(RangeError);
  });

  it.each([
    [-1, 100],
    [0, 0.5],
    [Number.NaN, Number.NaN],
    [0, Number.POSITIVE_INFINITY],
  ])("refuses %d–%d, which are not amounts in grosze", (min, max) => {
    expect(() => formatPlnRange(min, max)).toThrow(RangeError);
  });
});
