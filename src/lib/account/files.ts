// Regole sui file caricati dai clienti (Q10): estensioni ammesse, dimensione massima,
// nome sanificato e percorso nello Storage. Nessuna dipendenza server: serve anche al browser.

export const ALLOWED_EXTENSIONS = [
  "stl",
  "3mf",
  "step",
  "stp",
  "obj",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "pdf",
  "zip",
] as const;

/** 100 MB: stesso limite del bucket `request-files` e del vincolo su `request_files.size_bytes`. */
export const DEFAULT_MAX_UPLOAD_BYTES = 104_857_600;

export const STORAGE_BUCKET = "request-files";

const MAX_STORED_NAME = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STORED_FILE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[A-Za-z0-9][A-Za-z0-9._-]*$/i;

/**
 * UUID v4 dal generatore sicuro del browser. `crypto.randomUUID()` esiste solo in contesti sicuri
 * (https o localhost): con `getRandomValues` funziona anche su http (es. prove in rete locale).
 */
export function randomUuid(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Legge `site_settings.max_upload_bytes` (jsonb). Valori non validi ricadono sul limite predefinito;
 * valori oltre il tetto del bucket vengono ridotti: l'impostazione può solo abbassare il limite.
 */
export function parseMaxUploadBytes(raw: unknown): number {
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isInteger(n) || n <= 0) return DEFAULT_MAX_UPLOAD_BYTES;
  return Math.min(n, DEFAULT_MAX_UPLOAD_BYTES);
}

/** Estensione in minuscolo, senza punto ("" se manca). */
export function getExtension(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 && dot < base.length - 1 ? base.slice(dot + 1).toLowerCase() : "";
}

/**
 * Nome sicuro per lo Storage: niente percorsi, accenti tolti, solo `A-Z a-z 0-9 . _ -`.
 * L'estensione resta riconoscibile anche con nomi molto lunghi. Mai vuoto.
 */
export function sanitizeFileName(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "");
  const cleaned = base
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/-{2,}/g, "-");
  // L'estensione si separa PRIMA di togliere i trattini iniziali, così "モデル.stl" (-> "-.stl") resta "file.stl".
  const dot = cleaned.lastIndexOf(".");
  const hasExt = dot >= 0 && /^[A-Za-z0-9]{1,10}$/.test(cleaned.slice(dot + 1));
  const ext = hasExt ? cleaned.slice(dot + 1).toLowerCase() : "";
  let stem = hasExt ? cleaned.slice(0, dot) : cleaned;
  stem = stem.replace(/^[-.]+/, "").replace(/[-.]+$/, "");
  if (stem === "") stem = "file";
  const room = MAX_STORED_NAME - (ext ? ext.length + 1 : 0);
  stem = stem.slice(0, Math.max(room, 1)).replace(/[-.]+$/, "") || "file";
  return ext ? `${stem}.${ext}` : stem;
}

export type FileCheck = { ok: true } | { ok: false; reason: "empty" | "extension" | "too_large" };

export function validateFile(file: { name: string; size: number }, maxBytes: number): FileCheck {
  if (!(file.size > 0)) return { ok: false, reason: "empty" };
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(getExtension(file.name))) {
    return { ok: false, reason: "extension" };
  }
  if (file.size > maxBytes) return { ok: false, reason: "too_large" };
  return { ok: true };
}

/** Percorso nello Storage: `<request_id>/<uuid>-<nome-sanificato>`. */
export function buildStoragePath(requestId: string, uuid: string, originalName: string): string {
  return `${requestId}/${uuid}-${sanitizeFileName(originalName)}`;
}

/**
 * Il percorso dichiarato dal client deve essere esattamente `<request_id>/<uuid>-<nome sicuro>`
 * della richiesta indicata: impedisce di registrare file di altre richieste o percorsi strani.
 */
export function isValidStoragePath(path: unknown, requestId: string): path is string {
  if (typeof path !== "string" || !isUuid(requestId)) return false;
  const prefix = `${requestId}/`;
  if (!path.startsWith(prefix)) return false;
  const file = path.slice(prefix.length);
  return file.length <= 36 + 1 + MAX_STORED_NAME && STORED_FILE_RE.test(file);
}

export function storageFileName(path: string): string {
  return path.split("/").pop() ?? path;
}

/** Tipo MIME dichiarato dal browser: solo forma `tipo/sottotipo`, altrimenti null. */
export function cleanMimeType(raw: unknown): string | null {
  return typeof raw === "string" && raw.length <= 100 && /^[\w.+-]+\/[\w.+-]+$/.test(raw) ? raw : null;
}

export function formatBytes(bytes: number, locale: string): string {
  const nf = new Intl.NumberFormat(locale === "en" ? "en-GB" : "it-IT", { maximumFractionDigits: 1 });
  if (bytes >= 1_048_576) return `${nf.format(bytes / 1_048_576)} MB`;
  if (bytes >= 1024) return `${nf.format(bytes / 1024)} KB`;
  return `${nf.format(bytes)} B`;
}
