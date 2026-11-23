import type { AbuseOutcome } from "@/lib/security/anti-abuse";
import { parseFormSchema, validateDetails, type FormField } from "./form-schema";
import {
  isFormLocale,
  kindFromQuoteMode,
  parseInterestFields,
  parseSource,
  readRawValues,
  type FieldErrors,
  type FormLocale,
  type RequestKind,
} from "./schema";

// Logica di invio del modulo, separata da Next e da Supabase tramite `deps`:
// così si collauda con dati finti. Il collegamento reale sta in actions.ts e store.ts.
//
// Principi di sicurezza:
// - la risposta e SEMPRE "ok" per email nuove o già registrate (niente enumerazione);
// - il bot che compila il campo trappola (honeypot) riceve "ok" e non succede nulla;
// - superato il limite per email si risponde "ok" senza fare nulla (non si rivela che l'email e nota);
// - nei log mai nome, email, telefono o testo della richiesta.

export type NewRequestRow = {
  customer_id: string;
  business_line_id: number;
  kind: RequestKind;
  description: string;
  measures: string | null;
  deadline: string | null;
  details: Record<string, string | number | boolean>;
  source: string | null;
  privacy_consent_at: string;
  privacy_document_id: number | null;
};

export type InterestStore = {
  isPageActive(): Promise<boolean>;
  getQuoteMode(): Promise<unknown>;
  getLine(slug: string): Promise<{ id: number; formSchema: unknown } | null>;
  getPrivacyDocumentId(locale: FormLocale): Promise<number | null>;
  ensureCustomer(input: {
    email: string;
    fullName: string;
    phone: string | null;
    locale: FormLocale;
  }): Promise<string>;
  insertRequest(row: NewRequestRow): Promise<void>;
};

export type InterestDeps = {
  store: InterestStore;
  checkAbuse: (input: {
    scope: "interest";
    ip: string | null;
    email: string;
    turnstileToken: string | null;
  }) => Promise<AbuseOutcome>;
  sendMagicLink: (email: string, locale: FormLocale) => Promise<void>;
  now?: () => Date;
};

export type InterestErrorCode = "turnstile" | "rate_limited" | "unavailable" | "server";

export type InterestOutcome =
  | { status: "ok" }
  | { status: "invalid"; errors: FieldErrors; values: Record<string, string> }
  | { status: "error"; code: InterestErrorCode; values: Record<string, string> };

type FormLike = Parameters<typeof parseInterestFields>[0] & {
  entries(): Iterable<[string, FormDataEntryValue]>;
};

export const HONEYPOT_FIELD = "company_website";
export const TURNSTILE_FIELD = "cf-turnstile-response";

function logFailure(step: string, error: unknown) {
  // Solo il tipo/codice dell'errore, mai dati dell'utente.
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : error instanceof Error
        ? error.name
        : "unknown";
  console.error(`[interest] ${step} non riuscito (${code})`);
}

export async function processInterest(
  form: FormLike,
  ip: string | null,
  deps: InterestDeps,
): Promise<InterestOutcome> {
  const now = deps.now?.() ?? new Date();
  const rawLocale = form.get("locale");
  const locale: FormLocale = isFormLocale(rawLocale) ? rawLocale : "it";

  // 1. Honeypot: un utente vero non vede questo campo.
  const trap = form.get(HONEYPOT_FIELD);
  if (typeof trap === "string" && trap.trim() !== "") return { status: "ok" };

  const values = readRawValues(form);

  try {
    // 2. La pagina dev'essere attiva (la Server Action si può chiamare anche senza passare dalla pagina).
    if (!(await deps.store.isPageActive())) return { status: "error", code: "unavailable", values };

    // 3. Validazione dei campi comuni e dei campi dinamici della linea scelta.
    const parsed = parseInterestFields(form, now);
    const errors: FieldErrors = parsed.ok ? {} : { ...parsed.errors };

    let fields: FormField[] = [];
    let lineId: number | null = null;
    const lineSlug = typeof values.line === "string" ? values.line.trim() : "";
    if (errors.line === undefined && lineSlug !== "") {
      const line = await deps.store.getLine(lineSlug);
      if (!line) errors.line = "invalid_line";
      else {
        lineId = line.id;
        fields = parseFormSchema(line.formSchema);
      }
    }

    const detailsInput: Record<string, string | undefined> = {};
    for (const field of fields) {
      const v = form.get(`details.${field.key}`);
      detailsInput[field.key] = typeof v === "string" ? v : undefined;
    }
    const detailsResult = validateDetails(fields, detailsInput);
    if (!detailsResult.ok) {
      for (const [key, code] of Object.entries(detailsResult.errors)) errors[`details.${key}`] = code;
    }

    if (!parsed.ok || Object.keys(errors).length > 0 || !detailsResult.ok || lineId === null) {
      return { status: "invalid", errors, values };
    }
    const data = parsed.data;

    // 4. Anti-spam: limite per IP, Turnstile, limite per email.
    const tokenRaw = form.get(TURNSTILE_FIELD);
    const abuse = await deps.checkAbuse({
      scope: "interest",
      ip,
      email: data.email,
      turnstileToken: typeof tokenRaw === "string" ? tokenRaw : null,
    });
    if (!abuse.ok) {
      switch (abuse.kind) {
        case "email_limited":
          return { status: "ok" }; // risposta uniforme: non rivela che l'email e gia nota
        case "ip_limited":
          return { status: "error", code: "rate_limited", values };
        case "turnstile":
          return { status: "error", code: "turnstile", values };
        case "unavailable":
          return { status: "error", code: "unavailable", values };
      }
    }

    // 5. Account (riuso se l'email esiste) + richiesta. Da qui in poi le due strade producono la stessa risposta.
    const kind = kindFromQuoteMode(await deps.store.getQuoteMode());
    const privacyDocumentId = await deps.store.getPrivacyDocumentId(locale);
    if (privacyDocumentId === null) console.warn("[interest] nessuna privacy pubblicata: privacy_document_id sara null");

    const customerId = await deps.store.ensureCustomer({
      email: data.email,
      fullName: data.name,
      phone: data.phone ?? null,
      locale,
    });
    await deps.store.insertRequest({
      customer_id: customerId,
      business_line_id: lineId,
      kind,
      description: data.description,
      measures: data.measures ?? null,
      deadline: data.deadline ?? null,
      details: detailsResult.details,
      source: parseSource(form.get("fonte")),
      privacy_consent_at: now.toISOString(),
      privacy_document_id: privacyDocumentId,
    });

    // 6. Magic link per l'area clienti. Un errore (es. SMTP) non annulla la richiesta gia salvata.
    try {
      await deps.sendMagicLink(data.email, locale);
    } catch (error) {
      logFailure("invio magic link", error);
    }
    return { status: "ok" };
  } catch (error) {
    logFailure("elaborazione", error);
    return { status: "error", code: "server", values };
  }
}
