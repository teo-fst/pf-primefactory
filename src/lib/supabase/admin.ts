import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, readEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Client con la chiave segreta: salta la Row Level Security.
 * Usalo SOLO in codice server (Server Actions, Route Handler) e solo per operazioni
 * che l'utente non può fare da solo (creare account, inserire la richiesta del modulo).
 * Il file inizia con "server-only": se qualcuno lo importa da un componente client
 * la build si ferma con un errore, e la chiave non finisce nel bundle del browser.
 */
export function createAdminClient() {
  const url = publicEnv.supabaseUrl();
  const secret = readEnv("SUPABASE_SECRET_KEY");
  if (!url || !secret) {
    throw new Error("Configurazione Supabase mancante: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY");
  }
  return createClient<Database>(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
