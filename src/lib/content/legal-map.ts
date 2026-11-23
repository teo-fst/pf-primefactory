/** Mappa tra lo slug nell'URL (/legale/<slug>) e il campo `kind` della tabella legal_documents. */
export const LEGAL_SLUG_TO_KIND = {
  privacy: "privacy",
  cookie: "cookie",
  termini: "termini",
  "consenso-riuso": "consenso_riuso",
  "solo-uso-pista": "solo_uso_pista",
} as const;

export type LegalSlug = keyof typeof LEGAL_SLUG_TO_KIND;
export type LegalKind = (typeof LEGAL_SLUG_TO_KIND)[LegalSlug];

export const LEGAL_SLUGS = Object.keys(LEGAL_SLUG_TO_KIND) as LegalSlug[];

export function isLegalSlug(value: string): value is LegalSlug {
  return Object.hasOwn(LEGAL_SLUG_TO_KIND, value);
}

export function legalKindFromSlug(slug: string): LegalKind | null {
  return isLegalSlug(slug) ? LEGAL_SLUG_TO_KIND[slug] : null;
}
