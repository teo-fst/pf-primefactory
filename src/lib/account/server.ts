import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DeleteAccountDeps } from "./delete-account";
import { STORAGE_BUCKET } from "./files";

// Operazioni che richiedono la chiave segreta (salta la RLS). Questo file inizia con "server-only":
// la chiave non può finire nel bundle del browser. Ogni funzione va chiamata SOLO dopo aver
// verificato l'identità (e, dove serve, la proprietà della richiesta) con la sessione dell'utente.

const PAGE = 100;

/** `richiesta` -> `file_ricevuti`. Condizionale: non tocca richieste già avanzate da un admin. */
export async function advanceToFilesReceived(requestId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("requests")
    .update({ status: "file_ricevuti" })
    .eq("id", requestId)
    .eq("status", "richiesta");
  if (error) throw new Error("update status");
}

export function createDeleteAccountDeps(): DeleteAccountDeps {
  const admin = createAdminClient();
  const bucket = admin.storage.from(STORAGE_BUCKET);
  return {
    async listRequestIds(userId) {
      const { data, error } = await admin.from("requests").select("id").eq("customer_id", userId);
      if (error) throw new Error("list requests");
      return data.map((r) => r.id);
    },
    async listStoragePaths(requestId) {
      const paths: string[] = [];
      for (let offset = 0; ; offset += PAGE) {
        const { data, error } = await bucket.list(requestId, { limit: PAGE, offset });
        if (error) throw new Error("list storage");
        for (const item of data) paths.push(`${requestId}/${item.name}`);
        if (data.length < PAGE) break;
      }
      return paths;
    },
    async removeStoragePaths(paths) {
      for (let i = 0; i < paths.length; i += PAGE) {
        const chunk = paths.slice(i, i + PAGE);
        const { data, error } = await bucket.remove(chunk);
        if (error) throw new Error("remove storage");
        if (data.length !== chunk.length) throw new Error("remove storage: incomplete");
      }
    },
    async deleteAuthUser(userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw new Error("delete user");
    },
  };
}
