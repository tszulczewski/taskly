const NBSP = "\u00a0";
const EN_DASH = "\u2013";

/**
 * Grosze → "1 200" or "1 200,05", grouped with NBSP, without "zł": what an amount field is
 * prefilled with, and `parsePlnToGrosze` reads it back to the same grosze. Built from the
 * integer's digits, with no float division. `pl-PL` Intl is not used: it leaves 4-digit amounts
 * ungrouped and always prints two decimals (decision F11).
 */
export function formatPlnAmount(grosze: number): string {
  if (!Number.isSafeInteger(grosze) || grosze < 0) {
    throw new RangeError(`Not an amount in grosze: ${grosze}`);
  }
  const digits = String(grosze).padStart(3, "0");
  const zloty = digits.slice(0, -2).replace(/\B(?=(\d{3})+$)/g, NBSP);
  const fraction = digits.slice(-2);
  return fraction === "00" ? zloty : `${zloty},${fraction}`;
}

/**
 * The only place grosze become PLN: "1 200 zł", "12,50 zł" (tokens rule 5, decision F11). Spaces
 * are U+00A0; grosze are shown only when not zero.
 */
export function formatPln(grosze: number): string {
  return `${formatPlnAmount(grosze)}${NBSP}zł`;
}

/**
 * An estimate: "1 200–1 500 zł" (en dash without spaces, one "zł"), or one amount when min = max
 * (R18). Each side shows grosze only when its own are not zero: "1 200,05–1 500 zł".
 */
export function formatPlnRange(minGrosze: number, maxGrosze: number): string {
  if (minGrosze > maxGrosze) {
    throw new RangeError(`Minimum above maximum: ${minGrosze} > ${maxGrosze}`);
  }
  if (minGrosze === maxGrosze) return formatPln(minGrosze);
  return `${formatPlnAmount(minGrosze)}${EN_DASH}${formatPln(maxGrosze)}`;
}

/** The cap on one typed amount: 10 000 000.00 PLN. Sums (roll-ups, totals) may exceed it. */
export const MAX_ESTIMATE_GROSZE = 1_000_000_000;

// Whole złoty, either plain digits ("1500", "007") or grouped by threes with a space, NBSP or
// narrow NBSP ("1 500"; what pl-PL formatting and copy-paste produce). A grouped amount must not
// start with 0. Then an optional decimal comma or dot with 1–2 digits. A comma is always decimal,
// so "1,500" is three decimals and rejected rather than read as one thousand five hundred.
const PLN_AMOUNT = /^(?:[1-9]\d{0,2}(?:[ \u00a0\u202f]\d{3})+|\d+)(?:[.,](\d{1,2}))?$/;
const GROUP_SEPARATORS = /[ \u00a0\u202f]/g;

/**
 * Typed PLN text → integer grosze, or null when it is not an amount (negative, exponent, more than
 * two decimals, letters, empty). Leading and trailing whitespace is ignored. Pure string
 * arithmetic, no floats. Amounts too large to hold exactly as an integer are null too: they are
 * far above any cap, and an inexact value must never pass as money.
 */
export function parsePlnToGrosze(text: string): number | null {
  const match = PLN_AMOUNT.exec(text.trim());
  if (match === null) return null;
  const [amount, fraction = ""] = match;
  const whole = amount.split(/[.,]/)[0] as string;
  const grosze = Number(whole.replace(GROUP_SEPARATORS, "") + fraction.padEnd(2, "0"));
  return Number.isSafeInteger(grosze) ? grosze : null;
}
