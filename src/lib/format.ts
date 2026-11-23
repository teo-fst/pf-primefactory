/** Intl accetta "it-IT" e "en-GB" (inglese britannico, come nei testi del sito). */
export function intlLocale(locale: string): string {
  return locale === "en" ? "en-GB" : "it-IT";
}

/** Data (YYYY-MM-DD) o intervallo di date in forma leggibile. Le date sono senza orario: si usa UTC. */
export function formatDateRange(
  start: string,
  end: string | null,
  locale: string,
): string {
  const fmt = new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const from = fmt.format(new Date(`${start}T00:00:00Z`));
  if (!end || end === start) return from;
  const to = fmt.format(new Date(`${end}T00:00:00Z`));
  return `${from} – ${to}`;
}
