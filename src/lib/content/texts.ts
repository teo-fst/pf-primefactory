import fallbackJson from "../../../content/site-texts.json";

export type TextRows = { key: string; locale: string; value: string }[];

type FallbackFile = Record<string, Record<string, string>>;
const fallback = fallbackJson as FallbackFile;

/** Testi di riserva dal file content/site-texts.json, per lingua. */
export function fallbackTexts(locale: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, values] of Object.entries(fallback)) {
    const value = values[locale];
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/**
 * Unisce i testi in ordine di priorita crescente:
 * JSON it < JSON lingua < database it < database lingua.
 * Cosi una chiave mancante nella lingua richiesta ricade sull'italiano,
 * e se il database non risponde (rows null) restano i testi del file.
 */
export function mergeTexts(
  locale: string,
  rows: TextRows | null,
): Record<string, string> {
  const merged: Record<string, string> = {
    ...fallbackTexts("it"),
    ...(locale === "it" ? {} : fallbackTexts(locale)),
  };
  if (rows) {
    for (const row of rows) if (row.locale === "it") merged[row.key] = row.value;
    if (locale !== "it") {
      for (const row of rows) if (row.locale === locale) merged[row.key] = row.value;
    }
  }
  return merged;
}

/** Divide un testo in paragrafi (separati da riga vuota). */
export function toParagraphs(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** "Richiesta. Compili il modulo..." -> { title: "Richiesta", body: "Compili il modulo..." } */
export function splitStep(text: string | undefined): { title: string; body: string } {
  if (!text) return { title: "", body: "" };
  const index = text.indexOf(". ");
  if (index < 0) return { title: "", body: text };
  return { title: text.slice(0, index), body: text.slice(index + 2) };
}
