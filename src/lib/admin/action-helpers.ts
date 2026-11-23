import "server-only";
import { revalidatePath } from "next/cache";
import type { ActionState } from "./action-state";
import { classifyDbError, type DbErrorLike } from "./db-errors";
import { getAdminMessages, type AdminMessages } from "./messages";
import { guardAdmin } from "./guard";

// Pezzi comuni delle Server Action del pannello.

/** Valore testuale di un campo del modulo, senza spazi ai bordi ("" se assente). */
export function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function flag(form: FormData, name: string): boolean {
  const value = form.get(name);
  return value === "on" || value === "true" || value === "1";
}

export const ok = (message: string): ActionState => ({ status: "ok", message });
export const fail = (message: string): ActionState => ({ status: "error", message });

export function dbErrorText(m: AdminMessages, error: DbErrorLike): string {
  return m.errors[classifyDbError(error)];
}

/**
 * Inizio di ogni Server Action: ricontrolla che chi chiama sia admin (il ruolo viene riletto dal
 * database). Restituisce l'id dell'admin oppure l'esito d'errore da restituire subito.
 */
export async function adminActionStart(): Promise<
  { ok: true; userId: string; m: AdminMessages } | { ok: false; state: ActionState }
> {
  const m = getAdminMessages();
  const guard = await guardAdmin();
  if (!guard.ok) return { ok: false, state: fail(m.common.forbidden) };
  return { ok: true, userId: guard.userId, m };
}

/** Fa rileggere le pagine del pannello (sono dinamiche: serve solo ad aggiornare quella aperta). */
export function refreshAdmin() {
  revalidatePath("/[locale]/admin", "layout");
}
