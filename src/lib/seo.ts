import type { Metadata } from "next";
import { readEnv } from "@/lib/content/env";
import { routing } from "@/i18n/routing";

const FALLBACK_SITE_URL = "http://localhost:3000";

/** Indirizzo base del sito, senza barra finale. Da NEXT_PUBLIC_SITE_URL. */
export function siteUrl(): string {
  return (readEnv("NEXT_PUBLIC_SITE_URL") ?? FALLBACK_SITE_URL).replace(/\/+$/, "");
}

/** URL assoluto di un percorso (senza prefisso lingua, es. "/linee/moto-bici" o "/") in una lingua. */
export function localizedUrl(locale: string, path: string): string {
  return `${siteUrl()}/${locale}${path === "/" ? "" : path}`;
}

/** Mappa hreflang: una voce per lingua piu x-default (italiano). */
export function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) languages[locale] = localizedUrl(locale, path);
  languages["x-default"] = localizedUrl(routing.defaultLocale, path);
  return languages;
}

/** Metadati comuni: titolo, descrizione, canonical, hreflang e Open Graph. */
export function pageMetadata(options: {
  locale: string;
  path: string;
  title: string;
  description?: string;
  /** Titolo completo, senza il suffisso "| Primefactory". */
  absoluteTitle?: boolean;
}): Metadata {
  const { locale, path, title, description, absoluteTitle } = options;
  const url = localizedUrl(locale, path);
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      title,
      description,
      url,
      siteName: "Primefactory",
      type: "website",
      locale: locale === "en" ? "en_GB" : "it_IT",
    },
  };
}

/** Serializza JSON-LD in modo sicuro dentro un tag <script>. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
