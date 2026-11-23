import { z } from "zod";
import { isValidIsoDate } from "./form-schema";

// Regole del modulo lista d'interesse / preventivo (Q11, Q39, Q8).
// Gli errori sono CODICI (non frasi): l'interfaccia li traduce con messages/*.json.

export const SOURCE_RE = /^[a-z0-9-]{1,80}$/;
export const SLUG_RE = /^[a-z0-9-]{1,80}$/;
const PHONE_RE = /^\+?[0-9 ().\-/]{6,40}$/;

export const LOCALES = ["it", "en"] as const;
export type FormLocale = (typeof LOCALES)[number];

export function isFormLocale(value: unknown): value is FormLocale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Il campo "fonte" (QR di un evento) è nascosto e non fidato: se non rispetta la regola si ignora. */
export function parseSource(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  return SOURCE_RE.test(raw) ? raw : null;
}

export type RequestKind = "interesse" | "preventivo";

/** Interruttore unico (Q8): quote_mode true = preventivo, qualsiasi altro valore = lista d'interesse. */
export function kindFromQuoteMode(value: unknown): RequestKind {
  return value === true ? "preventivo" : "interesse";
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function makeInterestSchema(now: Date = new Date()) {
  // Un giorno di tolleranza per i fusi orari; massimo 5 anni nel futuro.
  const earliest = isoDay(new Date(now.getTime() - 24 * 3600 * 1000));
  const latest = isoDay(new Date(now.getTime() + 5 * 365 * 24 * 3600 * 1000));

  return z.object({
    name: z
      .string({ error: "required" })
      .min(2, { error: "too_short" })
      .max(200, { error: "too_long" }),
    email: z
      .string({ error: "required" })
      .max(254, { error: "too_long" })
      .pipe(z.email({ error: "invalid_email" })),
    phone: z
      .string()
      .max(40, { error: "too_long" })
      .regex(PHONE_RE, { error: "invalid_phone" })
      .optional(),
    line: z.string({ error: "required" }).regex(SLUG_RE, { error: "invalid_line" }),
    description: z
      .string({ error: "required" })
      .min(10, { error: "too_short" })
      .max(5000, { error: "too_long" }),
    measures: z.string().max(2000, { error: "too_long" }).optional(),
    deadline: z
      .string()
      .refine(isValidIsoDate, { error: "invalid_date" })
      .refine((d) => d >= earliest, { error: "date_past" })
      .refine((d) => d <= latest, { error: "invalid_date" })
      .optional(),
    consent: z.literal(true, { error: "consent_required" }),
  });
}

export type InterestFields = z.infer<ReturnType<typeof makeInterestSchema>>;
export type FieldErrors = Record<string, string>;

type FormDataLike = { get(name: string): FormDataEntryValue | null };

function text(form: FormDataLike, name: string): string | undefined {
  const value = form.get(name);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Valori testuali grezzi, per ripopolare il modulo dopo un errore (mai password: qui non ce ne sono). */
export const FORM_FIELD_NAMES = ["name", "email", "phone", "line", "description", "measures", "deadline"] as const;

export function readRawValues(form: FormDataLike & { entries(): Iterable<[string, FormDataEntryValue]> }): Record<string, string> {
  const values: Record<string, string> = {};
  for (const name of FORM_FIELD_NAMES) {
    const v = form.get(name);
    if (typeof v === "string") values[name] = v.slice(0, 5000);
  }
  if (form.get("consent") === "on") values.consent = "on";
  for (const [name, v] of form.entries()) {
    if (name.startsWith("details.") && typeof v === "string") values[name] = v.slice(0, 600);
  }
  return values;
}

export type ParsedInterest =
  | { ok: true; data: InterestFields }
  | { ok: false; errors: FieldErrors };

/** Valida i campi comuni. Per ogni campo restituisce solo il primo errore. */
export function parseInterestFields(form: FormDataLike, now: Date = new Date()): ParsedInterest {
  const emailRaw = text(form, "email");
  const input = {
    name: text(form, "name"),
    email: emailRaw?.toLowerCase(),
    phone: text(form, "phone"),
    line: text(form, "line"),
    description: text(form, "description"),
    measures: text(form, "measures"),
    deadline: text(form, "deadline"),
    consent: form.get("consent") === "on",
  };

  const result = makeInterestSchema(now).safeParse(input);
  if (result.success) return { ok: true, data: result.data };

  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? "form");
    if (!(field in errors)) errors[field] = issue.message;
  }
  return { ok: false, errors };
}
