// Codice "fonte" degli eventi (Q39): finisce nel QR come ?fonte=<codice> e in requests.source.
// Stesso formato accettato dal modulo pubblico: a-z, 0-9 e trattino, da 1 a 80 caratteri.

export const SOURCE_CODE_MAX = 80;
const SOURCE_CODE_RE = /^[a-z0-9-]{1,80}$/;

export function isValidSourceCode(code: string): boolean {
  return SOURCE_CODE_RE.test(code);
}

/** "Trackday Misano 2026 - Gruppo Èlite!" -> "trackday-misano-2026-gruppo-elite". Vuoto se non resta nulla. */
export function slugifySourceCode(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, SOURCE_CODE_MAX).replace(/-+$/g, "");
}

/**
 * Rende unico un codice rispetto a quelli già usati: "fiera", "fiera-2", "fiera-3"...
 * Se il titolo non dà nessun carattere utile usa "evento".
 */
export function uniqueSourceCode(base: string, existing: Iterable<string>): string {
  const taken = new Set(existing);
  const root = base === "" ? "evento" : base;
  if (!taken.has(root)) return root;
  for (let n = 2; n < 10_000; n++) {
    const suffix = `-${n}`;
    const candidate = root.slice(0, SOURCE_CODE_MAX - suffix.length).replace(/-+$/g, "") + suffix;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error("Impossibile generare un codice fonte unico");
}
