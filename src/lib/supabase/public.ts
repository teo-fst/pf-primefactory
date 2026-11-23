import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Client anonimo senza sessione né cookie, con la sola chiave pubblicabile.
 * Va bene per leggere dati pubblici (linee, impostazioni, testi: la RLS decide cosa si vede)
 * e per chiedere l'invio del magic link. Restituisce null se Supabase non è configurato.
 */
export function createPublicClient() {
  const url = publicEnv.supabaseUrl();
  const key = publicEnv.supabasePublishableKey();
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
