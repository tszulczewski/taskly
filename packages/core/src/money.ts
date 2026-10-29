const plnFormat = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });

/** The only place grosze become PLN: formatting at the UI edge. */
export function formatPln(grosze: number): string {
  return plnFormat.format(grosze / 100);
}

export function formatPlnRange(minGrosze: number, maxGrosze: number): string {
  return `${formatPln(minGrosze)} – ${formatPln(maxGrosze)}`;
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
