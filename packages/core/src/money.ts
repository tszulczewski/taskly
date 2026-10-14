const plnFormat = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });

/** The only place grosze become PLN: formatting at the UI edge. */
export function formatPln(grosze: number): string {
  return plnFormat.format(grosze / 100);
}

export function formatPlnRange(minGrosze: number, maxGrosze: number): string {
  return `${formatPln(minGrosze)} – ${formatPln(maxGrosze)}`;
}
