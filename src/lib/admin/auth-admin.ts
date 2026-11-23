import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/seo";
import type { AppRole } from "@/lib/auth/roles";
import { classifyDbError } from "./db-errors";

// Operazioni che hanno BISOGNO della chiave segreta e quindi saltano la RLS:
//  - leggere l'email di un utente (sta in auth.users, non in `profiles`);
//  - invitare un utente;
//  - cambiare il ruolo di un profilo (la RLS lo vieta a chiunque, per non permettere auto-promozioni).
// Tutto il resto del pannello usa il client con la sessione dell'utente, dove decide la RLS.
// Chi chiama queste funzioni deve aver già verificato il ruolo admin (guardAdmin / initAdminPage).

export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const { data } = await createAdminClient().auth.admin.getUserById(userId);
    return data.user?.email ?? null;
  } catch {
    console.warn("[admin] lettura email utente non riuscita");
    return null;
  }
}

/** Email di un insieme di utenti. Scorre gli utenti a pagine (fino a 5000) e si ferma appena le ha tutte. */
export async function listUserEmails(ids: string[]): Promise<Map<string, string>> {
  const wanted = new Set(ids);
  const found = new Map<string, string>();
  if (wanted.size === 0) return found;
  try {
    const admin = createAdminClient();
    for (let page = 1; page <= 5 && found.size < wanted.size; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error || data.users.length === 0) break;
      for (const user of data.users) {
        if (wanted.has(user.id) && user.email) found.set(user.id, user.email);
      }
      if (data.users.length < 1000) break;
    }
  } catch {
    console.warn("[admin] elenco email utenti non riuscito");
  }
  return found;
}

export async function inviteUserByEmail(
  email: string,
  fullName: string,
): Promise<{ userId: string } | { error: "exists" | "failed" }> {
  try {
    const { data, error } = await createAdminClient().auth.admin.inviteUserByEmail(email, {
      data: fullName ? { full_name: fullName } : undefined,
      redirectTo: `${siteUrl()}/it/admin`,
    });
    if (error) {
      if (error.code === "email_exists" || error.status === 422) return { error: "exists" };
      console.warn(`[admin] invito non riuscito (${error.code ?? error.status ?? "errore"})`);
      return { error: "failed" };
    }
    return { userId: data.user.id };
  } catch {
    console.warn("[admin] invito non riuscito (eccezione)");
    return { error: "failed" };
  }
}

export async function setProfileRole(
  userId: string,
  role: AppRole,
): Promise<{ ok: true } | { ok: false; lastAdmin: boolean }> {
  const { data, error } = await createAdminClient().from("profiles").update({ role }).eq("id", userId).select("id");
  if (error || !data || data.length === 0) {
    return { ok: false, lastAdmin: classifyDbError(error) === "last_admin" };
  }
  return { ok: true };
}

export async function listAdminIds(): Promise<string[]> {
  const { data } = await createAdminClient().from("profiles").select("id").eq("role", "admin");
  return (data ?? []).map((row) => row.id);
}
