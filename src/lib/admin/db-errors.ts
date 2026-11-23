// Traduce gli errori Postgres/PostgREST in codici che il pannello sa spiegare in italiano.
// Il database resta l'autorità: qui si legge solo il suo rifiuto (vincoli, RLS) per dirlo in modo chiaro.

export type DbErrorLike = { code?: string | null; message?: string | null; details?: string | null } | null | undefined;

export type DbErrorCode =
  | "rights_required"
  | "duplicate"
  | "last_admin"
  | "forbidden"
  | "same_status"
  | "invalid_reference"
  | "too_long"
  | "constraint"
  | "unknown";

export function classifyDbError(error: DbErrorLike): DbErrorCode {
  if (!error) return "unknown";
  const text = `${error.message ?? ""} ${error.details ?? ""}`;
  if (text.includes("portfolio_rights_before_publish")) return "rights_required";
  if (text.includes("ultimo_admin")) return "last_admin";
  if (text.includes("stato_invariato")) return "same_status";
  if (text.includes("nota_troppo_lunga")) return "too_long";
  switch (error.code) {
    case "23505":
      return "duplicate";
    case "42501":
      return "forbidden";
    case "23503":
      return "invalid_reference";
    case "22001":
      return "too_long";
    case "23514":
      return "constraint";
    default:
      return "unknown";
  }
}
