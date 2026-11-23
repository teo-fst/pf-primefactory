import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { parseFormSchema, type FormField } from "./form-schema";
import { kindFromQuoteMode } from "./schema";
import { getSiteTexts } from "./site-texts";

export type InterestLine = { id: number; slug: string; name: string; fields: FormField[] };

export type InterestPageData =
  | { status: "ok"; quoteMode: boolean; lines: InterestLine[]; texts: Record<string, string> }
  | { status: "not_found" } // la pagina lista-interesse non e attiva
  | { status: "unavailable" }; // database non raggiungibile

/**
 * Dati pubblici per la pagina del modulo, letti con il client anonimo (la RLS mostra solo
 * pagine e linee attive). Distingue "pagina spenta" (404) da "database non raggiungibile" (messaggio).
 */
export const loadInterestPage = cache(async (locale: string): Promise<InterestPageData> => {
  const client = createPublicClient();
  if (!client) return { status: "unavailable" };

  try {
    const [page, settings, lines, texts] = await Promise.all([
      client.from("pages").select("slug").eq("slug", "lista-interesse").eq("visibility", "attiva").maybeSingle(),
      client.from("site_settings").select("value").eq("key", "quote_mode").maybeSingle(),
      client
        .from("business_lines")
        .select("id, slug, name_it, name_en, form_schema")
        .eq("visibility", "attiva")
        .eq("accepts_requests", true)
        .order("sort"),
      getSiteTexts(locale, ["interest.title", "interest.intro"]),
    ]);
    if (page.error || settings.error || lines.error) return { status: "unavailable" };
    if (!page.data) return { status: "not_found" };

    return {
      status: "ok",
      quoteMode: kindFromQuoteMode(settings.data?.value) === "preventivo",
      lines: (lines.data ?? []).map((l) => ({
        id: l.id,
        slug: l.slug,
        name: locale === "en" ? l.name_en : l.name_it,
        fields: parseFormSchema(l.form_schema),
      })),
      texts,
    };
  } catch {
    return { status: "unavailable" };
  }
});
