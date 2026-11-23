import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getActiveBusinessLines, getActivePages } from "@/lib/content";
import { isLegalSlug } from "@/lib/content/legal-map";
import { languageAlternates, localizedUrl } from "@/lib/seo";

// Elenco generato a ogni richiesta: segue le pagine e le linee rese attive dal pannello.
export const dynamic = "force-dynamic";

/** Percorso (senza lingua) di una pagina della tabella `pages`. */
function pagePath(slug: string): string {
  if (slug === "home") return "/";
  if (isLegalSlug(slug)) return `/legale/${slug}`;
  return `/${slug}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pages, lines] = await Promise.all([getActivePages(), getActiveBusinessLines()]);

  const entries: { path: string; updatedAt: string }[] = [
    ...pages.map((page) => ({ path: pagePath(page.slug), updatedAt: page.updated_at })),
    ...lines.map((line) => ({ path: `/linee/${line.slug}`, updatedAt: line.updated_at })),
  ];

  return entries.flatMap(({ path, updatedAt }) =>
    routing.locales.map((locale) => ({
      url: localizedUrl(locale, path),
      lastModified: new Date(updatedAt),
      alternates: { languages: languageAlternates(path) },
    })),
  );
}
