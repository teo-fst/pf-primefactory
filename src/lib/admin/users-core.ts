import { z } from "zod";
import type { AppRole } from "@/lib/auth/roles";

// Utenti del pannello (Q37): invito di admin/operatori e cambio ruolo.
// Logica senza dipendenze da Next o da Supabase: le operazioni vere (invio dell'invito, scrittura del
// ruolo con la chiave segreta) arrivano come `deps`, così si provano con dati finti.
// La regola "l'ultimo admin non perde il ruolo" è controllata qui E da un trigger del database
// (profiles_protect_last_admin): il trigger vale anche se questo codice venisse aggirato.

export const ASSIGNABLE_ROLES = ["admin", "operatore", "cliente"] as const satisfies readonly AppRole[];
export const INVITABLE_ROLES = ["admin", "operatore"] as const satisfies readonly AppRole[];

type FormLike = { get(name: string): FormDataEntryValue | null };

function text(form: FormLike, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// ---------- invito ----------

const inviteSchema = z.object({
  email: z.string().max(254).pipe(z.email()),
  role: z.enum(INVITABLE_ROLES),
  fullName: z.string().max(200),
});

export type InviteCode = "invalid_email" | "invalid_role" | "exists" | "failed" | "role_failed";
export type InviteOutcome = { status: "ok"; email: string } | { status: "error"; code: InviteCode };

export type InviteDeps = {
  /** Crea l'utente e invia l'email d'invito. */
  inviteByEmail: (email: string, fullName: string) => Promise<{ userId: string } | { error: "exists" | "failed" }>;
  /** Imposta il ruolo sul profilo (chiave segreta). */
  setRole: (userId: string, role: AppRole) => Promise<boolean>;
};

export async function processInvite(form: FormLike, deps: InviteDeps): Promise<InviteOutcome> {
  const email = text(form, "email").toLowerCase();
  if (!z.string().max(254).pipe(z.email()).safeParse(email).success) {
    return { status: "error", code: "invalid_email" };
  }
  const parsed = inviteSchema.safeParse({ email, role: text(form, "role"), fullName: text(form, "full_name") });
  if (!parsed.success) return { status: "error", code: "invalid_role" };

  const invited = await deps.inviteByEmail(parsed.data.email, parsed.data.fullName);
  if ("error" in invited) return { status: "error", code: invited.error };

  // Il profilo nasce "cliente" (trigger del database): qui si assegna il ruolo richiesto.
  const done = await deps.setRole(invited.userId, parsed.data.role);
  return done ? { status: "ok", email: parsed.data.email } : { status: "error", code: "role_failed" };
}

// ---------- cambio ruolo ----------

export type RoleChangeCode = "invalid" | "last_admin" | "failed";
export type RoleChangeOutcome = { status: "ok" } | { status: "error"; code: RoleChangeCode };

export type RoleChangeDeps = {
  /** Id di tutti gli utenti con ruolo admin, compreso quello che si sta modificando. */
  listAdminIds: () => Promise<string[]>;
  setRole: (userId: string, role: AppRole) => Promise<{ ok: true } | { ok: false; lastAdmin: boolean }>;
};

const roleChangeSchema = z.object({
  userId: z.uuid(),
  role: z.enum(ASSIGNABLE_ROLES),
});

/** True se togliere il ruolo admin a `targetId` lascerebbe il sistema senza admin. */
export function wouldRemoveLastAdmin(adminIds: readonly string[], targetId: string, newRole: AppRole): boolean {
  if (newRole === "admin") return false;
  if (!adminIds.includes(targetId)) return false;
  return adminIds.filter((id) => id !== targetId).length === 0;
}

export async function processRoleChange(form: FormLike, deps: RoleChangeDeps): Promise<RoleChangeOutcome> {
  const parsed = roleChangeSchema.safeParse({ userId: text(form, "user_id"), role: text(form, "role") });
  if (!parsed.success) return { status: "error", code: "invalid" };
  const { userId, role } = parsed.data;

  const adminIds = await deps.listAdminIds();
  if (wouldRemoveLastAdmin(adminIds, userId, role)) return { status: "error", code: "last_admin" };

  const result = await deps.setRole(userId, role);
  if (result.ok) return { status: "ok" };
  return { status: "error", code: result.lastAdmin ? "last_admin" : "failed" };
}
