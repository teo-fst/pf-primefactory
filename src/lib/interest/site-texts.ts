import { createPublicClient } from "@/lib/supabase/public";

/**
 * Query minima ai testi modificabili dal pannello (tabella site_texts, lettura pubblica).
 * Restituisce solo le chiavi trovate: se manca la lingua richiesta si usa l'italiano.
 * Se Supabase non risponde restituisce un oggetto vuoto e l'interfaccia usa i testi di messages/*.json.
 */
export async function getSiteTexts(locale: string, keys: string[]): Promise<Record<string, string>> {
  const client = createPublicClient();
  if (!client) return {};
  try {
    const { data, error } = await client
      .from("site_texts")
      .select("key, locale, value")
      .in("key", keys)
      .in("locale", locale === "it" ? ["it"] : [locale, "it"]);
    if (error || !data) return {};
    const result: Record<string, string> = {};
    for (const row of data) {
      if (row.locale === locale || !(row.key in result)) result[row.key] = row.value;
    }
    return result;
  } catch {
    return {};
  }
}
