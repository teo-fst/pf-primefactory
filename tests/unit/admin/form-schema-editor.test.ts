// @vitest-environment node
import { describe, expect, it } from "vitest";
import { MAX_OPTIONS, parseFormSchemaText, validateFormSchemaInput } from "@/lib/admin/form-schema-editor";
import { MAX_FIELDS } from "@/lib/interest/form-schema";

const text = (extra: Record<string, unknown> = {}) => ({
  key: "marca",
  type: "text",
  label_it: "Marca",
  label_en: "Make",
  required: true,
  ...extra,
});

const select = (options: unknown) => ({
  key: "uso",
  type: "select",
  label_it: "Uso",
  label_en: "Use",
  options,
});

function codes(raw: unknown): string[] {
  const result = validateFormSchemaInput(raw);
  return result.ok ? [] : result.issues.map((i) => i.code);
}

describe("validateFormSchemaInput: casi validi", () => {
  it("accetta la schema vuota", () => {
    expect(validateFormSchemaInput([])).toEqual({ ok: true, schema: [] });
  });

  it("normalizza: spazi tolti, required esplicito, options solo per i select", () => {
    const result = validateFormSchemaInput([
      { key: "marca", type: "text", label_it: "  Marca ", label_en: "Make" },
      select([{ value: "pista", label_it: "Pista", label_en: "Track" }]),
      { key: "anno", type: "number", label_it: "Anno", label_en: "Year", required: false },
      { key: "data", type: "date", label_it: "Data", label_en: "Date" },
      { key: "file", type: "boolean", label_it: "File", label_en: "File" },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.schema[0]).toEqual({ key: "marca", type: "text", label_it: "Marca", label_en: "Make", required: false });
    expect(result.schema[1].options).toEqual([{ value: "pista", label_it: "Pista", label_en: "Track" }]);
    expect(result.schema[2].options).toBeUndefined();
  });
});

describe("validateFormSchemaInput: errori", () => {
  it("non è un array", () => {
    expect(codes({ key: "a" })).toEqual(["not_array"]);
    expect(codes(null)).toEqual(["not_array"]);
    expect(codes("[]")).toEqual(["not_array"]);
  });

  it("troppi campi", () => {
    const many = Array.from({ length: MAX_FIELDS + 1 }, (_, i) => text({ key: `campo${i}` }));
    expect(codes(many)).toEqual(["too_many_fields"]);
  });

  it("voce che non è un oggetto", () => {
    expect(codes(["marca", 3, null, [text()]])).toEqual(["not_object", "not_object", "not_object", "not_object"]);
  });

  it("chiave non valida, anche quelle pericolose", () => {
    for (const key of ["Marca", "1marca", "ma rca", "", "__proto__", "a".repeat(41), 5, undefined]) {
      expect(codes([text({ key })])).toContain("invalid_key");
    }
  });

  it("chiave duplicata", () => {
    expect(codes([text(), text()])).toEqual(["duplicate_key"]);
  });

  it("tipo sconosciuto", () => {
    expect(codes([text({ type: "textarea" })])).toEqual(["invalid_type"]);
    expect(codes([text({ type: undefined })])).toEqual(["invalid_type"]);
  });

  it("etichette obbligatorie e non troppo lunghe", () => {
    expect(codes([text({ label_it: "" })])).toEqual(["label_required"]);
    expect(codes([text({ label_en: "   " })])).toEqual(["label_required"]);
    expect(codes([text({ label_it: undefined })])).toEqual(["label_required"]);
    expect(codes([text({ label_it: "x".repeat(201) })])).toEqual(["label_too_long"]);
  });

  it("required deve essere vero o falso", () => {
    expect(codes([text({ required: "sì" })])).toEqual(["invalid_required"]);
  });

  it("proprietà sconosciute", () => {
    const result = validateFormSchemaInput([text({ placeholder: "x" })]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]).toMatchObject({ code: "unknown_property", detail: "placeholder" });
  });

  it("il select ha bisogno di opzioni", () => {
    expect(codes([select(undefined)])).toEqual(["options_required"]);
    expect(codes([select([])])).toEqual(["options_required"]);
    expect(codes([select("pista")])).toEqual(["options_required"]);
  });

  it("le opzioni sono ammesse solo nei select", () => {
    expect(codes([text({ options: [] })])).toEqual(["options_not_allowed"]);
  });

  it("opzioni malformate, duplicate o troppe", () => {
    expect(codes([select([{ value: "a b", label_it: "A", label_en: "A" }])])).toEqual(["invalid_option_value"]);
    expect(codes([select([{ value: "a", label_it: "A", label_en: "A", extra: 1 }])])).toEqual(["invalid_option"]);
    expect(codes([select(["a"])])).toEqual(["invalid_option"]);
    const dup = { value: "a", label_it: "A", label_en: "A" };
    expect(codes([select([dup, dup])])).toEqual(["duplicate_option_value"]);
    const tooMany = Array.from({ length: MAX_OPTIONS + 1 }, (_, i) => ({ value: `v${i}`, label_it: "x", label_en: "x" }));
    expect(codes([select(tooMany)])).toContain("too_many_options");
  });

  it("etichette delle opzioni obbligatorie", () => {
    expect(codes([select([{ value: "a", label_it: "", label_en: "A" }])])).toEqual(["label_required"]);
  });

  it("riporta la posizione del campo che sbaglia", () => {
    const result = validateFormSchemaInput([text(), text({ key: "modello", type: "boh" })]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues).toEqual([{ code: "invalid_type", index: 1, key: "modello", detail: "boh" }]);
  });

  it("segnala tutti gli errori insieme, non solo il primo", () => {
    expect(codes([text({ key: "X" }), text({ label_it: "" })]).length).toBeGreaterThanOrEqual(2);
  });
});

describe("parseFormSchemaText", () => {
  it("JSON non valido", () => {
    const result = parseFormSchemaText("[{");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0].code).toBe("invalid_json");
  });

  it("testo vuoto non è una schema", () => {
    expect(parseFormSchemaText("").ok).toBe(false);
  });

  it("JSON valido passa alla validazione di struttura", () => {
    expect(parseFormSchemaText("[]").ok).toBe(true);
    expect(parseFormSchemaText('{"a":1}').ok).toBe(false);
    expect(parseFormSchemaText(JSON.stringify([text()])).ok).toBe(true);
  });
});
