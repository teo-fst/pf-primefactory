"use server";

import { z } from "zod";
import type { ActionState } from "@/lib/admin/action-state";
import { adminActionStart, dbErrorText, fail, field, ok, refreshAdmin } from "@/lib/admin/action-helpers";
import { createClient } from "@/lib/supabase/server";

// Ogni azione: 1) ricontrolla il ruolo admin, 2) valida i dati, 3) scrive con il client della SESSIONE,
// così la RLS del database è la seconda autorizzazione (un non-admin verrebbe rifiutato anche qui).

const statusSchema = z.object({
  requestId: z.uuid(),
  status: z.string().regex(/^[a-z_]{1,40}$/),
  note: z.string().max(1000),
});

export async function changeRequestStatus(_previous: ActionState, form: FormData): Promise<ActionState> {
  const start = await adminActionStart();
  if (!start.ok) return start.state;
  const { m } = start;

  const parsed = statusSchema.safeParse({
    requestId: field(form, "request_id"),
    status: field(form, "status"),
    note: field(form, "note"),
  });
  if (!parsed.success) return fail(parsed.error.issues.some((i) => i.path[0] === "note") ? m.errors.too_long : m.errors.invalid);

  const supabase = await createClient();
  // La funzione SQL cambia lo stato e scrive la nota sulla riga di storico creata dal trigger.
  const { error } = await supabase.rpc("change_request_status", {
    p_request_id: parsed.data.requestId,
    p_status: parsed.data.status,
    p_note: parsed.data.note || undefined,
  });
  if (error) return fail(dbErrorText(m, error));

  refreshAdmin();
  return ok(m.requests.statusChanged);
}

const messageSchema = z.object({
  requestId: z.uuid(),
  body: z.string().min(1).max(5000),
  visibility: z.enum(["public", "internal"]),
});

export async function postRequestMessage(_previous: ActionState, form: FormData): Promise<ActionState> {
  const start = await adminActionStart();
  if (!start.ok) return start.state;
  const { m, userId } = start;

  const parsed = messageSchema.safeParse({
    requestId: field(form, "request_id"),
    body: field(form, "body"),
    visibility: field(form, "visibility"),
  });
  if (!parsed.success) return fail(m.requests.messageInvalid);

  const supabase = await createClient();
  const { error } = await supabase.from("request_messages").insert({
    request_id: parsed.data.requestId,
    author_id: userId,
    body: parsed.data.body,
    internal: parsed.data.visibility === "internal",
  });
  if (error) return fail(dbErrorText(m, error));

  refreshAdmin();
  return ok(parsed.data.visibility === "internal" ? m.requests.noteSaved : m.requests.messageSent);
}
