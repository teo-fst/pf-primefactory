"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { STORAGE_BUCKET, parseMaxUploadBytes, isUuid, storageFileName } from "@/lib/account/files";
import { validateMessageBody } from "@/lib/account/messages";
import { processFileRegistration, type RegisterInput, type RegisterResult } from "@/lib/account/register-file";
import { advanceToFilesReceived } from "@/lib/account/server";
import { createClient } from "@/lib/supabase/server";

// Tutte le azioni usano la sessione dell'utente (RLS) e rifanno i controlli: il client non è mai fidato.
// La chiave segreta serve solo per il passaggio di stato, dopo il controllo di proprietà.

export type MessageState =
  | { status: "idle" }
  | { status: "sent"; nonce: number }
  | { status: "error"; code: "empty" | "too_long" | "not_found" | "auth" | "server"; draft: string };

export async function registerUploadedFile(input: RegisterInput): Promise<RegisterResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "not_found" };
  const supabase = await createClient();

  const { data: setting } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "max_upload_bytes")
    .maybeSingle();

  const result = await processFileRegistration(input, {
    userId: user.id,
    maxBytes: parseMaxUploadBytes(setting?.value),
    async findOwnedRequest(requestId) {
      // La RLS mostra al cliente solo le proprie richieste; il filtro su customer_id vale anche per gli admin.
      const { data } = await supabase
        .from("requests")
        .select("id, status")
        .eq("id", requestId)
        .eq("customer_id", user.id)
        .maybeSingle();
      return data;
    },
    async getObjectSize(path) {
      const name = storageFileName(path);
      const folder = path.slice(0, path.length - name.length - 1);
      const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(folder, { limit: 5, search: name });
      if (error) return null;
      const size = data.find((o) => o.name === name)?.metadata?.size;
      return typeof size === "number" ? size : null;
    },
    async insertFile(row) {
      const { error } = await supabase.from("request_files").insert(row);
      return !error;
    },
    advanceToFilesReceived,
  });

  if (result.ok) revalidatePath("/[locale]/area-clienti/[codice]", "page");
  return result;
}

export async function sendMessage(_previous: MessageState, formData: FormData): Promise<MessageState> {
  const raw = formData.get("body");
  const draft = typeof raw === "string" ? raw : "";
  const check = validateMessageBody(raw);
  if (!check.ok) return { status: "error", code: check.error, draft };

  const requestId = formData.get("request_id");
  if (!isUuid(requestId)) return { status: "error", code: "not_found", draft };

  const user = await getCurrentUser();
  if (!user) return { status: "error", code: "auth", draft };

  const supabase = await createClient();
  // La policy RLS impone author_id = utente corrente, richiesta propria e internal = false.
  const { error } = await supabase
    .from("request_messages")
    .insert({ request_id: requestId, author_id: user.id, body: check.body, internal: false });
  if (error) {
    // 42501 = violazione RLS: la richiesta non è dell'utente (o non esiste).
    return { status: "error", code: error.code === "42501" ? "not_found" : "server", draft };
  }

  revalidatePath("/[locale]/area-clienti/[codice]", "page");
  return { status: "sent", nonce: Date.now() };
}
