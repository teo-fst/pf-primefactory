"use server";

import type { ActionState } from "@/lib/admin/action-state";
import { adminActionStart, fail, ok, refreshAdmin } from "@/lib/admin/action-helpers";
import { inviteUserByEmail, listAdminIds, setProfileRole } from "@/lib/admin/auth-admin";
import { processInvite, processRoleChange } from "@/lib/admin/users-core";

// Utenti (Q37). Qui serve la chiave segreta (invito, cambio ruolo): per questo, oltre al ruolo
// ricontrollato all'inizio, ogni passo critico ha una seconda barriera nel database
// (trigger profiles_protect_last_admin: l'ultimo admin non perde il ruolo).

export async function inviteUser(_previous: ActionState, form: FormData): Promise<ActionState> {
  const start = await adminActionStart();
  if (!start.ok) return start.state;
  const { m } = start;

  const outcome = await processInvite(form, {
    inviteByEmail: inviteUserByEmail,
    setRole: async (userId, role) => (await setProfileRole(userId, role)).ok,
  });
  if (outcome.status === "error") return fail(m.users.inviteErrors[outcome.code]);

  refreshAdmin();
  return ok(m.users.inviteSent.replace("{email}", outcome.email));
}

export async function changeUserRole(_previous: ActionState, form: FormData): Promise<ActionState> {
  const start = await adminActionStart();
  if (!start.ok) return start.state;
  const { m } = start;

  const outcome = await processRoleChange(form, { listAdminIds, setRole: setProfileRole });
  if (outcome.status === "error") return fail(m.users.roleErrors[outcome.code]);

  refreshAdmin();
  return ok(m.users.roleChanged);
}
