// Campi dinamici del modulo (Q43): ogni linea di business ha una `form_schema`
// (jsonb) modificabile dall'admin. Qui la leggiamo in modo tollerante e la usiamo per
// validare i `details` lato server. Nessuna dipendenza server: serve anche al browser.

export const FIELD_TYPES = ["text", "number", "select", "boolean", "date"] as const;
export type FormFieldType = (typeof FIELD_TYPES)[number];

export type FormFieldOption = { value: string; label_it: string; label_en: string };

export type FormField = {
  key: string;
  type: FormFieldType;
  label_it: string;
  label_en: string;
  required: boolean;
  options?: FormFieldOption[];
};

export type DetailError = "required" | "too_long" | "invalid_number" | "invalid_option" | "invalid_date";

export type DetailsResult =
  | { ok: true; details: Record<string, string | number | boolean> }
  | { ok: false; errors: Record<string, DetailError> };

// Deve iniziare con una lettera: esclude chiavi come __proto__.
export const KEY_RE = /^[a-z][a-z0-9_]{0,39}$/;
export const OPTION_VALUE_RE = /^[a-z0-9_.-]{1,60}$/i;
const NUMBER_RE = /^-?\d{1,12}(\.\d{1,6})?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_FIELDS = 30;
export const MAX_TEXT_LENGTH = 500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asLabel(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value.trim().slice(0, 200) : fallback;
}

/**
 * Legge la `form_schema` così come arriva dal database. Scarta in silenzio le voci
 * malformate (tipo sconosciuto, chiave non valida, duplicati, select senza opzioni):
 * un errore di configurazione dell'admin non deve rompere il modulo.
 */
export function parseFormSchema(raw: unknown): FormField[] {
  if (!Array.isArray(raw)) return [];
  const fields: FormField[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (fields.length >= MAX_FIELDS) break;
    if (!isRecord(item)) continue;
    const { key, type } = item;
    if (typeof key !== "string" || !KEY_RE.test(key) || seen.has(key)) continue;
    if (typeof type !== "string" || !(FIELD_TYPES as readonly string[]).includes(type)) continue;

    const field: FormField = {
      key,
      type: type as FormFieldType,
      label_it: asLabel(item.label_it, key),
      label_en: asLabel(item.label_en, key),
      required: item.required === true,
    };

    if (field.type === "select") {
      const options: FormFieldOption[] = [];
      if (Array.isArray(item.options)) {
        for (const opt of item.options) {
          if (!isRecord(opt) || typeof opt.value !== "string" || !OPTION_VALUE_RE.test(opt.value)) continue;
          options.push({
            value: opt.value,
            label_it: asLabel(opt.label_it, opt.value),
            label_en: asLabel(opt.label_en, opt.value),
          });
        }
      }
      if (options.length === 0) continue;
      field.options = options;
    }

    seen.add(key);
    fields.push(field);
  }
  return fields;
}

export function fieldLabel(field: Pick<FormField, "label_it" | "label_en">, locale: string): string {
  return locale === "en" ? field.label_en : field.label_it;
}

export function optionLabel(option: FormFieldOption, locale: string): string {
  return locale === "en" ? option.label_en : option.label_it;
}

export function isValidIsoDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * Valida i valori inviati contro la `form_schema`. `input` ha come chiave la `key` del campo.
 * Le chiavi che non sono nella schema vengono ignorate (non finiscono mai nei `details`).
 */
export function validateDetails(
  fields: FormField[],
  input: Record<string, string | undefined>,
): DetailsResult {
  const details: Record<string, string | number | boolean> = {};
  const errors: Record<string, DetailError> = {};

  for (const field of fields) {
    const raw = input[field.key];
    const value = typeof raw === "string" ? raw.trim() : "";

    if (field.type === "boolean") {
      const checked = value === "on" || value === "true" || value === "1";
      if (field.required && !checked) errors[field.key] = "required";
      else details[field.key] = checked;
      continue;
    }

    if (value === "") {
      if (field.required) errors[field.key] = "required";
      continue;
    }

    switch (field.type) {
      case "text":
        if (value.length > MAX_TEXT_LENGTH) errors[field.key] = "too_long";
        else details[field.key] = value;
        break;
      case "number":
        if (!NUMBER_RE.test(value)) errors[field.key] = "invalid_number";
        else details[field.key] = Number(value);
        break;
      case "select":
        if (!field.options?.some((o) => o.value === value)) errors[field.key] = "invalid_option";
        else details[field.key] = value;
        break;
      case "date":
        if (!isValidIsoDate(value)) errors[field.key] = "invalid_date";
        else details[field.key] = value;
        break;
    }
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, details };
}
