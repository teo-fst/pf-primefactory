import "server-only";
import { forbidden } from "next/navigation";
import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { roleAllows, type RequiredRole } from "./roles";

// Sessione e ruoli lato server (Server Components, Server Actions, Route Handler).
// - L'identità si verifica con getClaims(): controlla la firma del token (non si fida del cookie in chiaro).
// - Il ruolo si legge SEMPRE dalla tabella `profiles` con il client dell'utente: la RLS decide cosa vede.

export type CurrentUser = { id: string; email: string | null };
export type CurrentProfile = Pick<Tables<"profiles">, "id" | "role" | "full_name" | "phone" | "locale">;

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims || typeof claims.sub !== "string") return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});

export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone, locale")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return null;
  return data;
});

/**
 * Pagina riservata a chi ha fatto l'accesso. Senza sessione (o con account ormai cancellato:
 * token valido ma profilo assente) porta a /accedi.
 */
export async function requireUser(locale: string): Promise<{ user: CurrentUser; profile: CurrentProfile }> {
  const user = await getCurrentUser();
  const profile = user ? await getCurrentProfile() : null;
  if (!user || !profile) redirect({ href: "/accedi", locale });
  return { user: user!, profile: profile! };
}

/** Pagina riservata a un ruolo. Senza accesso: /accedi. Con accesso ma ruolo insufficiente: 403. */
export async function requireRole(
  required: RequiredRole,
  locale: string,
): Promise<{ user: CurrentUser; profile: CurrentProfile }> {
  const session = await requireUser(locale);
  if (!roleAllows(session.profile.role, required)) forbidden();
  return session;
}
