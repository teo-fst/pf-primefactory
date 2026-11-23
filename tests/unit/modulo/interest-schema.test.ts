// @vitest-environment node
import { describe, expect, it } from "vitest";
import { kindFromQuoteMode, parseInterestFields, parseSource, SOURCE_RE } from "@/lib/interest/schema";

const NOW = new Date("2026-11-23T12:00:00Z");

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

const valid = {
  name: "Mario Rossi",
  email: "Mario.Rossi@Example.com",
  phone: "+39 333 123 4567",
  line: "moto-bici",
  description: "Supporto targa per R6, stampa in PETG.",
  measures: "120 x 40 mm",
  deadline: "2026-12-24",
  consent: "on",
};

describe("parseInterestFields", () => {
  it("accetta i campi comuni validi e porta l'email in minuscolo", () => {
    const r = parseInterestFields(form(valid), NOW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.email).toBe("mario.rossi@example.com");
      expect(r.data.consent).toBe(true);
      expect(r.data.deadline).toBe("2026-12-24");
    }
  });

  it("telefono, misure e scadenza sono facoltativi", () => {
    const r = parseInterestFields(form({ ...valid, phone: "", measures: "", deadline: "" }), NOW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.phone).toBeUndefined();
      expect(r.data.measures).toBeUndefined();
      expect(r.data.deadline).toBeUndefined();
    }
  });

  it("senza consenso privacy l'invio e rifiutato", () => {
    const { consent: _consent, ...senza } = valid;
    void _consent;
    const r = parseInterestFields(form(senza), NOW);
    expect(r).toEqual({ ok: false, errors: { consent: "consent_required" } });
  });

  it("segnala un errore per ogni campo, con codici", () => {
    const r = parseInterestFields(
      form({ name: "A", email: "non-una-email", phone: "abc", line: "Linea Strana!", description: "corta", deadline: "2020-01-01" }),
      NOW,
    );
    expect(r).toEqual({
      ok: false,
      errors: {
        name: "too_short",
        email: "invalid_email",
        phone: "invalid_phone",
        line: "invalid_line",
        description: "too_short",
        deadline: "date_past",
        consent: "consent_required",
      },
    });
  });

  it("campi obbligatori mancanti: required", () => {
    const r = parseInterestFields(form({}), NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors).toMatchObject({ name: "required", email: "required", line: "required", description: "required" });
    }
  });

  it("limiti di lunghezza: descrizione 10-5000", () => {
    expect(parseInterestFields(form({ ...valid, description: "x".repeat(5001) }), NOW)).toMatchObject({
      ok: false,
      errors: { description: "too_long" },
    });
    expect(parseInterestFields(form({ ...valid, description: "x".repeat(5000) }), NOW).ok).toBe(true);
    expect(parseInterestFields(form({ ...valid, description: "x".repeat(10) }), NOW).ok).toBe(true);
    expect(parseInterestFields(form({ ...valid, description: "x".repeat(9) }), NOW).ok).toBe(false);
  });

  it("scadenza: data inesistente o troppo lontana non valida", () => {
    expect(parseInterestFields(form({ ...valid, deadline: "2026-02-30" }), NOW)).toMatchObject({ errors: { deadline: "invalid_date" } });
    expect(parseInterestFields(form({ ...valid, deadline: "2040-01-01" }), NOW)).toMatchObject({ errors: { deadline: "invalid_date" } });
  });
});

describe("campo fonte (?fonte=)", () => {
  it("accetta solo ^[a-z0-9-]{1,80}$", () => {
    expect(parseSource("trackday-misano-2027")).toBe("trackday-misano-2027");
    expect(parseSource("a".repeat(80))).toBe("a".repeat(80));
  });

  it("ignora tutto il resto", () => {
    for (const bad of ["", "a".repeat(81), "Maiuscole", "con spazi", "x;drop", "../etc", "<script>", "caffè", null, undefined, 42]) {
      expect(parseSource(bad)).toBeNull();
    }
  });

  it("la regex e ancorata (niente a capo finale)", () => {
    expect(SOURCE_RE.test("ok\n")).toBe(false);
  });
});

describe("quote_mode", () => {
  it("false (o assente) = lista d'interesse, true = preventivo", () => {
    expect(kindFromQuoteMode(false)).toBe("interesse");
    expect(kindFromQuoteMode(true)).toBe("preventivo");
    expect(kindFromQuoteMode(undefined)).toBe("interesse");
    expect(kindFromQuoteMode(null)).toBe("interesse");
  });

  it("solo il booleano true attiva il preventivo", () => {
    expect(kindFromQuoteMode("true")).toBe("interesse");
    expect(kindFromQuoteMode(1)).toBe("interesse");
  });
});
