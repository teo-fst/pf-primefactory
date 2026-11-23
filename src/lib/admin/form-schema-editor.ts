// Validazione STRETTA della form_schema scritta dall'admin (Q43), prima del salvataggio.
// A differenza di parseFormSchema (src/lib/interest/form-schema.ts), che legge in modo tollerante
// ciò che è già nel database e scarta in silenzio le voci malformate, qui ogni errore viene
// segnalato: l'admin deve sapere perché una voce non va bene, invece di vederla sparire dal modulo.

import {
  FIELD_TYPES,
  KEY_RE,
  MAX_FIELDS,
  OPTION_VALUE_RE,
  type FormField,
  type FormFieldOption,
  type FormFieldType,
} from "@/lib/interest/form-schema";

export const MAX_OPTIONS = 30;
export const MAX_LABEL_LENGTH = 200;

export type SchemaIssueCode =
  | "invalid_json"
  | "not_array"
  | "too_many_fields"
  | "not_object"
  | "unknown_property"
  | "invalid_key"
  | "duplicate_key"
  | "invalid_type"
  | "label_required"
  | "label_too_long"
  | "invalid_required"
  | "options_required"
  | "options_not_allowed"
  | "too_many_options"
  | "invalid_option"
  | "invalid_option_value"
  | "duplicate_option_value";

/** `index` è la posizione (da 0) del campo nell'elenco; null per errori sull'insieme. */
export type SchemaIssue = { code: SchemaIssueCode; index: number | null; key?: string; detail?: string };

export type SchemaResult = { ok: true; schema: FormField[] } | { ok: false; issues: SchemaIssue[] };

const FIELD_PROPS = new Set(["key", "type", "label_it", "label_en", "required", "options"]);
const OPTION_PROPS = new Set(["value", "label_it", "label_en"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readLabel(
  value: unknown,
  name: "label_it" | "label_en",
  index: number,
  key: string | undefined,
  issues: SchemaIssue[],
): string {
  if (typeof value !== "string" || value.trim() === "") {
    issues.push({ code: "label_required", index, key, detail: name });
    return "";
  }
  const trimmed = value.trim();
  if (trimmed.length > MAX_LABEL_LENGTH) {
    issues.push({ code: "label_too_long", index, key, detail: name });
  }
  return trimmed;
}

function readOptions(
  raw: unknown,
  index: number,
  key: string | undefined,
  issues: SchemaIssue[],
): FormFieldOption[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    issues.push({ code: "options_required", index, key });
    return [];
  }
  if (raw.length > MAX_OPTIONS) issues.push({ code: "too_many_options", index, key });

  const options: FormFieldOption[] = [];
  const seen = new Set<string>();
  for (const item of raw.slice(0, MAX_OPTIONS)) {
    if (!isRecord(item) || Object.keys(item).some((p) => !OPTION_PROPS.has(p))) {
      issues.push({ code: "invalid_option", index, key });
      continue;
    }
    const value = item.value;
    if (typeof value !== "string" || !OPTION_VALUE_RE.test(value)) {
      issues.push({ code: "invalid_option_value", index, key, detail: typeof value === "string" ? value : "" });
      continue;
    }
    if (seen.has(value)) {
      issues.push({ code: "duplicate_option_value", index, key, detail: value });
      continue;
    }
    seen.add(value);
    options.push({
      value,
      label_it: readLabel(item.label_it, "label_it", index, key, issues),
      label_en: readLabel(item.label_en, "label_en", index, key, issues),
    });
  }
  return options;
}

/** Controlla la struttura e restituisce la schema normalizzata (spazi tolti, `required` esplicito). */
export function validateFormSchemaInput(raw: unknown): SchemaResult {
  if (!Array.isArray(raw)) return { ok: false, issues: [{ code: "not_array", index: null }] };
  if (raw.length > MAX_FIELDS) return { ok: false, issues: [{ code: "too_many_fields", index: null }] };

  const issues: SchemaIssue[] = [];
  const schema: FormField[] = [];
  const keys = new Set<string>();

  raw.forEach((item, index) => {
    if (!isRecord(item)) {
      issues.push({ code: "not_object", index });
      return;
    }
    for (const prop of Object.keys(item)) {
      if (!FIELD_PROPS.has(prop)) issues.push({ code: "unknown_property", index, detail: prop });
    }

    const rawKey = item.key;
    let key: string | undefined;
    if (typeof rawKey !== "string" || !KEY_RE.test(rawKey)) {
      issues.push({ code: "invalid_key", index, detail: typeof rawKey === "string" ? rawKey : "" });
    } else if (keys.has(rawKey)) {
      issues.push({ code: "duplicate_key", index, key: rawKey });
    } else {
      key = rawKey;
      keys.add(rawKey);
    }

    const type = item.type;
    const validType = typeof type === "string" && (FIELD_TYPES as readonly string[]).includes(type);
    if (!validType) issues.push({ code: "invalid_type", index, key, detail: typeof type === "string" ? type : "" });

    const label_it = readLabel(item.label_it, "label_it", index, key, issues);
    const label_en = readLabel(item.label_en, "label_en", index, key, issues);

    if (item.required !== undefined && typeof item.required !== "boolean") {
      issues.push({ code: "invalid_required", index, key });
    }

    let options: FormFieldOption[] | undefined;
    if (validType && type === "select") {
      options = readOptions(item.options, index, key, issues);
    } else if (item.options !== undefined) {
      issues.push({ code: "options_not_allowed", index, key });
    }

    if (key !== undefined && validType) {
      const field: FormField = {
        key,
        type: type as FormFieldType,
        label_it,
        label_en,
        required: item.required === true,
      };
      if (options) field.options = options;
      schema.push(field);
    }
  });

  return issues.length > 0 ? { ok: false, issues } : { ok: true, schema };
}

/** Come validateFormSchemaInput ma partendo dal testo incollato nell'editor. */
export function parseFormSchemaText(text: string): SchemaResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      issues: [{ code: "invalid_json", index: null, detail: error instanceof Error ? error.message : "" }],
    };
  }
  return validateFormSchemaInput(parsed);
}
