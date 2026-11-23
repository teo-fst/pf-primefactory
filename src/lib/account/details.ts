import { fieldLabel, optionLabel, parseFormSchema } from "@/lib/interest/form-schema";

// Campi dinamici della richiesta (Q43) in forma leggibile: etichette dalla `form_schema` della linea.
// Le chiavi presenti nei `details` ma non nella schema (schema cambiata dopo l'invio) non si mostrano.

export type DetailRow = { key: string; label: string; value: string };

export function describeDetails(
  schemaRaw: unknown,
  details: unknown,
  locale: string,
  labels: { yes: string; no: string },
  formatDate: (iso: string) => string,
): DetailRow[] {
  if (typeof details !== "object" || details === null || Array.isArray(details)) return [];
  const data = details as Record<string, unknown>;
  const rows: DetailRow[] = [];
  for (const field of parseFormSchema(schemaRaw)) {
    if (!Object.prototype.hasOwnProperty.call(data, field.key)) continue;
    const raw = data[field.key];
    let value: string;
    switch (field.type) {
      case "boolean":
        value = raw === true ? labels.yes : labels.no;
        break;
      case "select": {
        const option = field.options?.find((o) => o.value === raw);
        value = option ? optionLabel(option, locale) : String(raw ?? "");
        break;
      }
      case "date":
        value = typeof raw === "string" ? formatDate(raw) : "";
        break;
      default:
        value = raw === null || raw === undefined ? "" : String(raw);
    }
    if (value !== "") rows.push({ key: field.key, label: fieldLabel(field, locale), value });
  }
  return rows;
}
