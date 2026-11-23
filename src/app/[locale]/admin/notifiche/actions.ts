"use server";

import type { ActionState } from "@/lib/admin/action-state";
import { adminActionStart, dbErrorText, fail, field, ok, refreshAdmin } from "@/lib/admin/action-helpers";
import { createClient } from "@/lib/supabase/server";

// Notifiche in-app (Q27). Qui si gestisce solo la LETTURA: le righe le crea il blocco notifiche.
// La RLS permette di aggiornare solo `read_at` e solo sulle proprie righe; il filtro su user_id
// è comunque esplicito.

export async function markNotificationRead(_previous: ActionState, form: FormData): Promise<ActionState> {
  const start = await adminActionStart();
  if (!start.ok) return start.state;
  const { m, userId } = start;

  const id = field(form, "id");
  if (!/^\d{1,18}$/.test(id)) return fail(m.errors.invalid);

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", Number(id))
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) return fail(dbErrorText(m, error));

  refreshAdmin();
  return ok(m.notifications.markedRead);
}

export async function markAllNotificationsRead(): Promise<ActionState> {
  const start = await adminActionStart();
  if (!start.ok) return start.state;
  const { m, userId } = start;

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) return fail(dbErrorText(m, error));

  refreshAdmin();
  return ok(m.notifications.allMarkedRead);
}
