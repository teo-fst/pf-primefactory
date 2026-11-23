import "server-only";
import { cache } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { CACHE_TTL_SECONDS, cached } from "./cache";
import { createPublicClient } from "./client";
import { legalKindFromSlug, type LegalKind } from "./legal-map";
import { mergeTexts, type TextRows } from "./texts";

export { cached, invalidateCache } from "./cache";
export { portfolioImageUrl } from "./client";

export type BusinessLine = Tables<"business_lines">;
export type PageRow = Tables<"pages">;
export type PortfolioItem = Tables<"portfolio_items">;
export type EventRow = Tables<"events">;
export type LegalDocument = Pick<
  Tables<"legal_documents">,
  "kind" | "locale" | "version" | "body_md" | "published_at"
>;

const TTL = CACHE_TTL_SECONDS;

function ok<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

/** Locale usato per scegliere i campi *_it / *_en delle tabelle. */
export function pick<T extends Record<string, unknown>>(
  row: T,
  field: string,
  locale: string,
): string {
  const value = row[`${field}_${locale === "en" ? "en" : "it"}`];
  return typeof value === "string" ? value : "";
}

/**
 * Testi del sito per una lingua: database con ricaduta sull'italiano e poi su content/site-texts.json.
 * Se il database non risponde non solleva errori: restano i testi del file.
 */
export const getSiteTexts = cache(async (locale: string): Promise<Record<string, string>> => {
  try {
    const rows = await cached<TextRows>(`texts:${locale}`, TTL, async () =>
      ok(
        await createPublicClient()
          .from("site_texts")
          .select("key, locale, value")
          .in("locale", locale === "it" ? ["it"] : ["it", locale]),
      ),
    );
    return mergeTexts(locale, rows);
  } catch (error) {
    console.warn("Testi dal database non disponibili, uso il file di riserva:", error);
    return mergeTexts(locale, null);
  }
});

const loadActiveLines = cache(async (): Promise<BusinessLine[]> =>
  cached<BusinessLine[]>("lines:active", TTL, async () =>
    ok(
      await createPublicClient()
        .from("business_lines")
        .select("*")
        .eq("visibility", "attiva")
        .order("sort"),
    ),
  ),
);

export async function getActiveBusinessLines(): Promise<BusinessLine[]> {
  return loadActiveLines();
}

/** Linea attiva con quello slug, altrimenti null (pagina inesistente o non attiva). */
export async function getBusinessLine(slug: string): Promise<BusinessLine | null> {
  const lines = await loadActiveLines();
  return lines.find((line) => line.slug === slug) ?? null;
}

const loadActivePages = cache(async (): Promise<PageRow[]> =>
  cached<PageRow[]>("pages:active", TTL, async () =>
    ok(
      await createPublicClient()
        .from("pages")
        .select("*")
        .eq("visibility", "attiva")
        .order("sort"),
    ),
  ),
);

export async function getActivePages(): Promise<PageRow[]> {
  return loadActivePages();
}

/** Riga della pagina con quello slug se la sua visibilita e "attiva", altrimenti null. */
export async function getActivePage(slug: string): Promise<PageRow | null> {
  const pages = await loadActivePages();
  return pages.find((page) => page.slug === slug) ?? null;
}

/** True se la pagina con quello slug ha visibilita "attiva". */
export async function isPageActive(slug: string): Promise<boolean> {
  return (await getActivePage(slug)) !== null;
}

/** Foto pubblicate del portfolio (la RLS espone solo quelle con published = true). */
export const getPublishedPortfolio = cache(async (): Promise<PortfolioItem[]> =>
  cached<PortfolioItem[]>("portfolio:published", TTL, async () =>
    ok(
      await createPublicClient()
        .from("portfolio_items")
        .select("*")
        .eq("published", true)
        .eq("rights_transferred", true)
        .order("sort")
        .order("created_at", { ascending: false }),
    ),
  ),
);

/** Eventi pubblicati non ancora conclusi, dal piu vicino. */
export const getUpcomingEvents = cache(async (): Promise<EventRow[]> => {
  // La chiave include il giorno: a mezzanotte la cache cambia da sola.
  const today = new Date().toISOString().slice(0, 10);
  return cached<EventRow[]>(`events:upcoming:${today}`, TTL, async () =>
    ok(
      await createPublicClient()
        .from("events")
        .select("*")
        .eq("published", true)
        .or(`ends_on.gte.${today},and(ends_on.is.null,starts_on.gte.${today})`)
        .order("starts_on"),
    ),
  );
});

/**
 * Ultima versione pubblicata del documento legale, nella lingua richiesta
 * o, se manca, in italiano. `kind` e il valore del database (es. consenso_riuso).
 */
export const getLegalDocument = cache(
  async (kind: LegalKind, locale: string): Promise<LegalDocument | null> => {
    const wanted = locale === "it" ? ["it"] : [locale, "it"];
    const rows = await cached<LegalDocument[]>(`legal:${kind}:${locale}`, TTL, async () =>
      ok(
        await createPublicClient()
          .from("legal_documents")
          .select("kind, locale, version, body_md, published_at")
          .eq("kind", kind)
          .in("locale", wanted)
          .not("published_at", "is", null)
          .order("version", { ascending: false }),
      ),
    );
    for (const lang of wanted) {
      const found = rows.find((row) => row.locale === lang);
      if (found) return found;
    }
    return null;
  },
);

/** Come getLegalDocument ma partendo dallo slug dell'URL (es. consenso-riuso). */
export async function getLegalDocumentBySlug(
  slug: string,
  locale: string,
): Promise<LegalDocument | null> {
  const kind = legalKindFromSlug(slug);
  return kind ? getLegalDocument(kind, locale) : null;
}
