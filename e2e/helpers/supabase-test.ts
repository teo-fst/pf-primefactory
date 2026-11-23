import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Aiuti per i test e2e con il database reale (E2E_WITH_SUPABASE=1).
// Usano la chiave segreta SOLO dentro il processo di test (container e2e, mai nel browser).
// Tutti gli utenti di prova hanno email `pf-test+...@example.invalid`: il prefisso permette di
// riconoscerli e di verificare a fine giro che non ne resti nessuno.

const clean = (v: string | undefined) => v?.trim().replace(/^(["'])(.*)\1$/, "$2").trim() ?? "";

export const supabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const publishableKey = clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const secretKey = clean(process.env.SUPABASE_SECRET_KEY);

export const canRunWithSupabase =
  process.env.E2E_WITH_SUPABASE === "1" && supabaseUrl !== "" && publishableKey !== "" && secretKey !== "";

export const TEST_EMAIL_PREFIX = "pf-test+area";

export type AdminClient = SupabaseClient;

export function adminClient(): AdminClient {
  return createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Link di accesso (token_hash) per un utente esistente, come quello dell'email magic link. */
export async function magicLinkHash(admin: AdminClient, email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) throw new Error(`generateLink: ${error?.message ?? "nessun token"}`);
  return data.properties.hashed_token;
}

/** Sessione (access token) di un utente di prova, per verificare cosa vede lui via API. */
export async function sessionClient(admin: AdminClient, email: string): Promise<{ client: SupabaseClient; token: string }> {
  const hash = await magicLinkHash(admin, email);
  const client = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.verifyOtp({ type: "email", token_hash: hash });
  if (error || !data.session) throw new Error(`verifyOtp: ${error?.message ?? "nessuna sessione"}`);
  return { client, token: data.session.access_token };
}

export async function findUserId(admin: AdminClient, email: string): Promise<string | null> {
  const { data, error } = await admin.rpc("get_user_id_by_email", { p_email: email });
  if (error) throw new Error(`get_user_id_by_email: ${error.message}`);
  return (data as string | null) ?? null;
}

/** Cancella file di Storage e utente (la cascata elimina profilo, richieste, messaggi, file). */
export async function purgeUser(admin: AdminClient, email: string): Promise<void> {
  const id = await findUserId(admin, email);
  if (!id) return;
  const { data: requests } = await admin.from("requests").select("id").eq("customer_id", id);
  for (const r of requests ?? []) {
    const { data: objects } = await admin.storage.from("request-files").list(r.id, { limit: 1000 });
    const paths = (objects ?? []).map((o) => `${r.id}/${o.name}`);
    if (paths.length > 0) await admin.storage.from("request-files").remove(paths);
  }
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw new Error(`deleteUser: ${error.message}`);
}

export async function createTestUser(admin: AdminClient, email: string, fullName: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName, locale: "it" },
  });
  if (error || !data.user) throw new Error(`createUser: ${error?.message}`);
  return data.user.id;
}

export async function createTestRequest(
  admin: AdminClient,
  customerId: string,
  description: string,
  details: Record<string, string | number | boolean> = {},
): Promise<{ id: string; public_code: string }> {
  const { data: line } = await admin.from("business_lines").select("id").eq("slug", "moto-bici").single();
  const { data, error } = await admin
    .from("requests")
    .insert({
      customer_id: customerId,
      business_line_id: line!.id,
      description,
      details,
      privacy_consent_at: new Date().toISOString(),
    })
    .select("id, public_code")
    .single();
  if (error || !data) throw new Error(`insert request: ${error?.message}`);
  return data;
}

/** Quanti utenti di prova di QUESTO test (email `pf-test+area...`; altri blocchi usano altri prefissi) esistono ancora in auth.users. */
export async function countLeftoverTestUsers(admin: AdminClient): Promise<number> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(`listUsers: ${error.message}`);
  return data.users.filter((u) => (u.email ?? "").startsWith(TEST_EMAIL_PREFIX)).length;
}
