// Ruoli (Q12). Il ruolo vero sta nella tabella `profiles` (protetta dalla RLS: il cliente non può
// cambiarlo). Non va MAI letto dai metadata dell'utente (user_metadata), che il client può modificare.

export type AppRole = "admin" | "operatore" | "cliente";
export type RequiredRole = "admin" | "operatore";

/**
 * - "admin": solo gli admin.
 * - "operatore": operatori e admin (l'admin può fare tutto ciò che fa l'operatore).
 * Un cliente non passa mai; un ruolo sconosciuto o assente nemmeno.
 */
export function roleAllows(actual: AppRole | null | undefined, required: RequiredRole): boolean {
  if (actual === "admin") return true;
  return required === "operatore" && actual === "operatore";
}
