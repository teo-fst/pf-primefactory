// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseFormSchema } from "@/lib/interest/form-schema";
import {
  processInterest,
  type InterestDeps,
  type InterestStore,
  type NewRequestRow,
} from "@/lib/interest/submit";
import type { AbuseOutcome } from "@/lib/security/anti-abuse";

const NOW = new Date("2026-11-23T12:00:00Z");
const EMAIL = "mario.rossi@example.com";

const motoFields = [
  { key: "marca", type: "text", label_it: "Marca", label_en: "Make", required: true },
  {
    key: "uso",
    type: "select",
    label_it: "Uso",
    label_en: "Use",
    required: true,
    options: [{ value: "pista", label_it: "Pista", label_en: "Track" }],
  },
];

function makeForm(over: Record<string, string> = {}): FormData {
  const base: Record<string, string> = {
    locale: "it",
    name: "Mario Rossi",
    email: EMAIL,
    phone: "+39 333 1234567",
    line: "moto-bici",
    description: "Supporto targa per R6, stampa in PETG nero.",
    consent: "on",
    "details.marca": "Yamaha",
    "details.uso": "pista",
    "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX",
  };
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...base, ...over })) if (v !== "__rimuovi__") fd.set(k, v);
  return fd;
}

function setup(opts: {
  pageActive?: boolean;
  quoteMode?: unknown;
  existingUser?: string | null;
  abuse?: AbuseOutcome;
  magicLinkFails?: boolean;
  storeFailsOn?: "insertRequest" | "ensureCustomer";
  privacyId?: number | null;
} = {}) {
  const inserted: NewRequestRow[] = [];
  const created: Array<{ email: string; fullName: string; phone: string | null; locale: string }> = [];
  const store: InterestStore = {
    isPageActive: vi.fn(async () => opts.pageActive ?? true),
    getQuoteMode: vi.fn(async () => opts.quoteMode ?? false),
    getLine: vi.fn(async (slug: string) => (slug === "moto-bici" ? { id: 7, formSchema: motoFields } : null)),
    getPrivacyDocumentId: vi.fn(async () => (opts.privacyId === undefined ? 42 : opts.privacyId)),
    ensureCustomer: vi.fn(async (input) => {
      if (opts.storeFailsOn === "ensureCustomer") throw Object.assign(new Error("db"), { code: "XX000" });
      created.push(input);
      return opts.existingUser ?? "11111111-1111-1111-1111-111111111111";
    }),
    insertRequest: vi.fn(async (row) => {
      if (opts.storeFailsOn === "insertRequest") throw Object.assign(new Error("db"), { code: "23514" });
      inserted.push(row);
    }),
  };
  const sendMagicLink = vi.fn(async () => {
    if (opts.magicLinkFails) throw new Error("smtp");
  });
  const checkAbuse = vi.fn(async () => opts.abuse ?? ({ ok: true } as AbuseOutcome));
  const deps: InterestDeps = { store, checkAbuse, sendMagicLink, now: () => NOW };
  return { deps, store, inserted, created, sendMagicLink, checkAbuse };
}

let logged: string[];
beforeEach(() => {
  logged = [];
  for (const m of ["error", "warn", "log"] as const) {
    vi.spyOn(console, m).mockImplementation((...args: unknown[]) => {
      logged.push(args.map(String).join(" "));
    });
  }
});
afterEach(() => vi.restoreAllMocks());

describe("processInterest: percorso felice", () => {
  it("crea account e richiesta (interesse), poi invia il magic link", async () => {
    const s = setup();
    const out = await processInterest(makeForm({ fonte: "trackday-misano-2027", measures: "10x10", deadline: "2026-12-24" }), "203.0.113.7", s.deps);
    expect(out).toEqual({ status: "ok" });
    expect(s.created).toEqual([{ email: EMAIL, fullName: "Mario Rossi", phone: "+39 333 1234567", locale: "it" }]);
    expect(s.inserted).toEqual([
      {
        customer_id: "11111111-1111-1111-1111-111111111111",
        business_line_id: 7,
        kind: "interesse",
        description: "Supporto targa per R6, stampa in PETG nero.",
        measures: "10x10",
        deadline: "2026-12-24",
        details: { marca: "Yamaha", uso: "pista" },
        source: "trackday-misano-2027",
        privacy_consent_at: NOW.toISOString(),
        privacy_document_id: 42,
      },
    ]);
    expect(s.sendMagicLink).toHaveBeenCalledWith(EMAIL, "it");
    expect(s.checkAbuse).toHaveBeenCalledWith({
      scope: "interest",
      ip: "203.0.113.7",
      email: EMAIL,
      turnstileToken: "XXXX.DUMMY.TOKEN.XXXX",
    });
  });

  it("quote_mode true salva kind 'preventivo'", async () => {
    const s = setup({ quoteMode: true });
    await processInterest(makeForm(), null, s.deps);
    expect(s.inserted[0].kind).toBe("preventivo");
  });

  it("fonte non valida viene ignorata (source null) e la richiesta passa", async () => {
    const s = setup();
    const out = await processInterest(makeForm({ fonte: "Evil Source!!" }), null, s.deps);
    expect(out).toEqual({ status: "ok" });
    expect(s.inserted[0].source).toBeNull();
  });

  it("chiavi sconosciute nei details vengono scartate", async () => {
    const s = setup();
    await processInterest(makeForm({ "details.ruolo": "admin", "details.__proto__": "x" }), null, s.deps);
    expect(s.inserted[0].details).toEqual({ marca: "Yamaha", uso: "pista" });
  });

  it("lingua en: passa la lingua a profilo, privacy e magic link", async () => {
    const s = setup();
    await processInterest(makeForm({ locale: "en" }), null, s.deps);
    expect(s.created[0].locale).toBe("en");
    expect(s.store.getPrivacyDocumentId).toHaveBeenCalledWith("en");
    expect(s.sendMagicLink).toHaveBeenCalledWith(EMAIL, "en");
  });

  it("senza privacy pubblicata la richiesta passa con privacy_document_id null", async () => {
    const s = setup({ privacyId: null });
    expect(await processInterest(makeForm(), null, s.deps)).toEqual({ status: "ok" });
    expect(s.inserted[0].privacy_document_id).toBeNull();
  });
});

describe("processInterest: nessuna enumerazione", () => {
  it("email nuova ed email già registrata: stessa risposta", async () => {
    const nuova = await processInterest(makeForm(), "1.1.1.1", setup().deps);
    const esistente = await processInterest(makeForm(), "1.1.1.1", setup({ existingUser: "22222222-2222-2222-2222-222222222222" }).deps);
    expect(nuova).toEqual({ status: "ok" });
    expect(esistente).toEqual(nuova);
  });

  it("limite per email superato: stessa risposta 'ok', ma non scrive nulla", async () => {
    const s = setup({ abuse: { ok: false, kind: "email_limited" } });
    expect(await processInterest(makeForm(), null, s.deps)).toEqual({ status: "ok" });
    expect(s.created).toHaveLength(0);
    expect(s.inserted).toHaveLength(0);
    expect(s.sendMagicLink).not.toHaveBeenCalled();
  });

  it("il magic link che fallisce non cambia la risposta e la richiesta resta salvata", async () => {
    const s = setup({ magicLinkFails: true });
    expect(await processInterest(makeForm(), null, s.deps)).toEqual({ status: "ok" });
    expect(s.inserted).toHaveLength(1);
  });
});

describe("processInterest: difese", () => {
  it("honeypot compilato: risponde 'ok' ma non fa nulla (nemmeno anti-abuse o DB)", async () => {
    const s = setup();
    const out = await processInterest(makeForm({ company_website: "http://spam.example" }), null, s.deps);
    expect(out).toEqual({ status: "ok" });
    expect(s.store.isPageActive).not.toHaveBeenCalled();
    expect(s.checkAbuse).not.toHaveBeenCalled();
    expect(s.created).toHaveLength(0);
    expect(s.inserted).toHaveLength(0);
  });

  it("pagina non attiva: errore 'unavailable', nessuna scrittura", async () => {
    const s = setup({ pageActive: false });
    const out = await processInterest(makeForm(), null, s.deps);
    expect(out).toMatchObject({ status: "error", code: "unavailable" });
    expect(s.inserted).toHaveLength(0);
  });

  it("Turnstile non superato: errore 'turnstile', nessuna scrittura", async () => {
    const s = setup({ abuse: { ok: false, kind: "turnstile" } });
    expect(await processInterest(makeForm(), null, s.deps)).toMatchObject({ status: "error", code: "turnstile" });
    expect(s.created).toHaveLength(0);
  });

  it("limite per IP: errore 'rate_limited'", async () => {
    const s = setup({ abuse: { ok: false, kind: "ip_limited" } });
    expect(await processInterest(makeForm(), null, s.deps)).toMatchObject({ status: "error", code: "rate_limited" });
  });

  it("anti-abuse non disponibile (Redis o chiavi mancanti in produzione): errore esplicito", async () => {
    const s = setup({ abuse: { ok: false, kind: "unavailable" } });
    expect(await processInterest(makeForm(), null, s.deps)).toMatchObject({ status: "error", code: "unavailable" });
    expect(s.inserted).toHaveLength(0);
  });

  it("la validazione avviene prima dell'anti-abuse: gli errori di compilazione non consumano quote", async () => {
    const s = setup();
    const out = await processInterest(makeForm({ email: "non-una-email" }), null, s.deps);
    expect(out).toMatchObject({ status: "invalid", errors: { email: "invalid_email" } });
    expect(s.checkAbuse).not.toHaveBeenCalled();
  });
});

describe("processInterest: validazione", () => {
  it("linea sconosciuta o non attiva: invalid_line", async () => {
    const s = setup();
    const out = await processInterest(makeForm({ line: "linea-inventata" }), null, s.deps);
    expect(out).toMatchObject({ status: "invalid", errors: { line: "invalid_line" } });
  });

  it("campi dinamici obbligatori e opzioni non ammesse", async () => {
    const s = setup();
    const out = await processInterest(makeForm({ "details.marca": "", "details.uso": "spazio" }), null, s.deps);
    expect(out).toMatchObject({
      status: "invalid",
      errors: { "details.marca": "required", "details.uso": "invalid_option" },
    });
    expect(s.inserted).toHaveLength(0);
  });

  it("senza consenso privacy: consent_required", async () => {
    const s = setup();
    const out = await processInterest(makeForm({ consent: "__rimuovi__" }), null, s.deps);
    expect(out).toMatchObject({ status: "invalid", errors: { consent: "consent_required" } });
  });

  it("restituisce i valori per ripopolare il modulo, senza token né honeypot", async () => {
    const s = setup();
    const out = await processInterest(makeForm({ email: "x" }), null, s.deps);
    expect(out.status).toBe("invalid");
    if (out.status === "invalid") {
      expect(out.values).toMatchObject({ name: "Mario Rossi", "details.marca": "Yamaha", consent: "on" });
      expect(JSON.stringify(out.values)).not.toContain("DUMMY");
      expect(out.values).not.toHaveProperty("cf-turnstile-response");
    }
  });
});

describe("processInterest: errori e log", () => {
  it("errore del database: risposta 'server' (mai un falso 'ok')", async () => {
    for (const where of ["insertRequest", "ensureCustomer"] as const) {
      const s = setup({ storeFailsOn: where });
      expect(await processInterest(makeForm(), null, s.deps)).toMatchObject({ status: "error", code: "server" });
    }
  });

  it("nei log non compaiono email, nome, telefono o testo della richiesta", async () => {
    const failing = setup({ storeFailsOn: "insertRequest", magicLinkFails: true });
    await processInterest(makeForm(), "203.0.113.7", failing.deps);
    const ok = setup({ privacyId: null, magicLinkFails: true });
    await processInterest(makeForm(), "203.0.113.7", ok.deps);
    expect(logged.length).toBeGreaterThan(0);
    const all = logged.join("\n");
    for (const secret of [EMAIL, "Mario", "Rossi", "333 1234567", "Supporto targa", "203.0.113.7"]) {
      expect(all).not.toContain(secret);
    }
  });
});

describe("form_schema reale di moto-bici", () => {
  it("la schema di prova è letta senza scarti", () => {
    expect(parseFormSchema(motoFields)).toHaveLength(2);
  });
});
