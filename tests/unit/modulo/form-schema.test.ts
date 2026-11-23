// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isValidIsoDate, parseFormSchema, validateDetails } from "@/lib/interest/form-schema";

const motoSchema = [
  { key: "marca", type: "text", label_it: "Marca", label_en: "Make", required: true },
  { key: "anno", type: "number", label_it: "Anno", label_en: "Year", required: false },
  {
    key: "uso",
    type: "select",
    label_it: "Uso",
    label_en: "Use",
    required: true,
    options: [
      { value: "pista", label_it: "Pista", label_en: "Track" },
      { value: "strada", label_it: "Strada", label_en: "Road" },
    ],
  },
  { key: "file_modello", type: "boolean", label_it: "File", label_en: "File", required: false },
  { key: "quando", type: "date", label_it: "Quando", label_en: "When", required: false },
];

describe("parseFormSchema", () => {
  it("legge una schema valida", () => {
    const fields = parseFormSchema(motoSchema);
    expect(fields.map((f) => f.key)).toEqual(["marca", "anno", "uso", "file_modello", "quando"]);
    expect(fields[2].options).toHaveLength(2);
  });

  it("scarta in silenzio le voci malformate", () => {
    const fields = parseFormSchema([
      { key: "ok", type: "text", label_it: "Ok", label_en: "Ok" },
      { key: "tipo_strano", type: "file", label_it: "x", label_en: "x" },
      { key: "Maiuscola", type: "text" },
      { key: "__proto__", type: "text" },
      { key: "ok", type: "text" }, // duplicato
      { key: "senza_opzioni", type: "select", options: [] },
      "stringa",
      null,
    ]);
    expect(fields.map((f) => f.key)).toEqual(["ok"]);
  });

  it("restituisce [] se non è un array", () => {
    expect(parseFormSchema(null)).toEqual([]);
    expect(parseFormSchema({})).toEqual([]);
    expect(parseFormSchema("[]")).toEqual([]);
  });

  it("usa la chiave come etichetta se manca e tratta required solo se true", () => {
    const [f] = parseFormSchema([{ key: "misura", type: "text", required: "true" }]);
    expect(f.label_it).toBe("misura");
    expect(f.required).toBe(false);
  });
});

describe("validateDetails", () => {
  const fields = parseFormSchema(motoSchema);

  it("accetta valori validi, converte i numeri e salva i booleani", () => {
    const r = validateDetails(fields, { marca: " Yamaha ", anno: "2019", uso: "pista", file_modello: "on", quando: "2026-12-24" });
    expect(r).toEqual({
      ok: true,
      details: { marca: "Yamaha", anno: 2019, uso: "pista", file_modello: true, quando: "2026-12-24" },
    });
  });

  it("omette i facoltativi vuoti e salva boolean false", () => {
    const r = validateDetails(fields, { marca: "Honda", uso: "strada" });
    expect(r).toEqual({ ok: true, details: { marca: "Honda", uso: "strada", file_modello: false } });
  });

  it("segnala i campi obbligatori mancanti", () => {
    const r = validateDetails(fields, { marca: "  ", uso: "" });
    expect(r).toEqual({ ok: false, errors: { marca: "required", uso: "required" } });
  });

  it("rifiuta opzioni non ammesse", () => {
    const r = validateDetails(fields, { marca: "X", uso: "spazio" });
    expect(r).toEqual({ ok: false, errors: { uso: "invalid_option" } });
  });

  it("rifiuta numeri e date non validi", () => {
    const r = validateDetails(fields, { marca: "X", uso: "pista", anno: "venti", quando: "2026-02-30" });
    expect(r).toEqual({ ok: false, errors: { anno: "invalid_number", quando: "invalid_date" } });
  });

  it("rifiuta testi troppo lunghi", () => {
    const r = validateDetails(fields, { marca: "a".repeat(501), uso: "pista" });
    expect(r).toEqual({ ok: false, errors: { marca: "too_long" } });
  });

  it("scarta le chiavi sconosciute: non finiscono nei details", () => {
    const r = validateDetails(fields, { marca: "X", uso: "pista", admin: "true", __proto__: "x", ruolo: "admin" } as Record<string, string>);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.keys(r.details).sort()).toEqual(["file_modello", "marca", "uso"]);
      expect(r.details).not.toHaveProperty("admin");
      expect(r.details).not.toHaveProperty("ruolo");
    }
  });

  it("boolean obbligatorio deve essere spuntato", () => {
    const f = parseFormSchema([{ key: "ok", type: "boolean", required: true }]);
    expect(validateDetails(f, {})).toEqual({ ok: false, errors: { ok: "required" } });
    expect(validateDetails(f, { ok: "on" })).toEqual({ ok: true, details: { ok: true } });
  });

  it("senza campi non produce details", () => {
    expect(validateDetails([], { qualsiasi: "x" })).toEqual({ ok: true, details: {} });
  });
});

describe("isValidIsoDate", () => {
  it("controlla il calendario reale", () => {
    expect(isValidIsoDate("2028-02-29")).toBe(true);
    expect(isValidIsoDate("2027-02-29")).toBe(false);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("24/12/2026")).toBe(false);
  });
});
