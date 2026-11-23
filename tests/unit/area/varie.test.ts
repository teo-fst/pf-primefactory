// @vitest-environment node
import { describe, expect, it } from "vitest";
import enMessages from "../../../messages/en.json";
import itMessages from "../../../messages/it.json";
import { describeDetails } from "@/lib/account/details";
import { MESSAGE_MAX_LENGTH, validateMessageBody } from "@/lib/account/messages";
import { parseProfileForm } from "@/lib/account/profile";

function form(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

describe("validateMessageBody", () => {
  it("toglie gli spazi ai bordi e normalizza gli a capo", () => {
    expect(validateMessageBody("  ciao\r\nmondo \n")).toEqual({ ok: true, body: "ciao\nmondo" });
  });
  it("conserva l'HTML come testo (verrà mostrato escapato)", () => {
    expect(validateMessageBody("<b>x</b>")).toEqual({ ok: true, body: "<b>x</b>" });
  });
  it("vuoto o solo spazi: errore", () => {
    for (const v of ["", "   \n ", undefined, null, 5]) expect(validateMessageBody(v)).toEqual({ ok: false, error: "empty" });
  });
  it("limite di 5000 caratteri (CHECK del database)", () => {
    expect(validateMessageBody("a".repeat(MESSAGE_MAX_LENGTH)).ok).toBe(true);
    expect(validateMessageBody("a".repeat(MESSAGE_MAX_LENGTH + 1))).toEqual({ ok: false, error: "too_long" });
  });
});

describe("parseProfileForm", () => {
  it("valori validi", () => {
    expect(parseProfileForm(form({ full_name: " Mario Rossi ", phone: "+39 333 1234567", locale: "en" }))).toEqual({
      ok: true,
      values: { full_name: "Mario Rossi", phone: "+39 333 1234567", locale: "en" },
    });
  });
  it("telefono facoltativo: vuoto diventa null", () => {
    const out = parseProfileForm(form({ full_name: "Mario", phone: "", locale: "it" }));
    expect(out).toMatchObject({ ok: true, values: { phone: null } });
  });
  it("errori per campo", () => {
    expect(parseProfileForm(form({ full_name: "", phone: "abc", locale: "xx" }))).toEqual({
      ok: false,
      errors: { full_name: "name_required", phone: "phone_invalid", locale: "locale_invalid" },
    });
    expect(parseProfileForm(form({ full_name: "a".repeat(201), phone: "", locale: "it" }))).toMatchObject({
      ok: false,
      errors: { full_name: "name_too_long" },
    });
  });
  it("accetta solo it/en anche se la RLS consente fr/es", () => {
    expect(parseProfileForm(form({ full_name: "M", phone: "", locale: "fr" })).ok).toBe(false);
  });
  it("ignora campi extra (es. role): ritorna solo nome, telefono, lingua", () => {
    const out = parseProfileForm(form({ full_name: "M", phone: "", locale: "it", role: "admin", id: "x" }));
    expect(out.ok && Object.keys(out.values).sort()).toEqual(["full_name", "locale", "phone"]);
  });
});

describe("describeDetails", () => {
  const schema = [
    { key: "marca", type: "text", label_it: "Marca", label_en: "Make", required: true },
    { key: "uso", type: "select", label_it: "Uso", label_en: "Use", required: true, options: [{ value: "pista", label_it: "Pista", label_en: "Track" }] },
    { key: "file_modello", type: "boolean", label_it: "File modello", label_en: "Model file", required: false },
    { key: "quando", type: "date", label_it: "Quando", label_en: "When", required: false },
    { key: "anno", type: "number", label_it: "Anno", label_en: "Year", required: false },
  ];
  const labels = { yes: "Sì", no: "No" };
  const fmt = (iso: string) => `D:${iso}`;

  it("etichette e valori leggibili, nella lingua richiesta", () => {
    const details = { marca: "Yamaha", uso: "pista", file_modello: true, quando: "2027-05-01", anno: 2020 };
    expect(describeDetails(schema, details, "it", labels, fmt)).toEqual([
      { key: "marca", label: "Marca", value: "Yamaha" },
      { key: "uso", label: "Uso", value: "Pista" },
      { key: "file_modello", label: "File modello", value: "Sì" },
      { key: "quando", label: "Quando", value: "D:2027-05-01" },
      { key: "anno", label: "Anno", value: "2020" },
    ]);
    expect(describeDetails(schema, { uso: "pista" }, "en", labels, fmt)).toEqual([{ key: "uso", label: "Use", value: "Track" }]);
  });
  it("ignora chiavi non presenti nella schema e dati malformati", () => {
    expect(describeDetails(schema, { sconosciuta: "x" }, "it", labels, fmt)).toEqual([]);
    expect(describeDetails(schema, null, "it", labels, fmt)).toEqual([]);
    expect(describeDetails(schema, ["a"], "it", labels, fmt)).toEqual([]);
    expect(describeDetails("non-array", { marca: "x" }, "it", labels, fmt)).toEqual([]);
  });
  it("opzione sconosciuta: mostra il valore grezzo", () => {
    expect(describeDetails(schema, { uso: "altro" }, "it", labels, fmt)).toEqual([{ key: "uso", label: "Uso", value: "altro" }]);
  });
});

describe("messaggi account it/en", () => {
  const keys = (o: unknown, prefix = ""): string[] =>
    typeof o === "object" && o !== null
      ? Object.entries(o).flatMap(([k, v]) => keys(v, `${prefix}${k}.`))
      : [prefix];
  it("stesse chiavi nelle due lingue", () => {
    expect(keys(enMessages.account).sort()).toEqual(keys(itMessages.account).sort());
  });
});
