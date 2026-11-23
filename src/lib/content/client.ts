import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { readEnv } from "./env";

/**
 * Client Supabase per i contenuti pubblici: solo lato server, chiave publishable (RLS),
 * nessun cookie e nessuna sessione. Le pagine non diventano dinamiche per colpa dei cookie.
 */
export function createPublicClient() {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) throw new Error("Variabili Supabase mancanti");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    // Se Supabase e in pausa o lento, meglio il testo di riserva che una pagina appesa.
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }),
    },
  });
}

/** URL pubblico di un file del bucket `portfolio`. */
export function portfolioImageUrl(path: string): string | null {
  const base = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (!base) return null;
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/portfolio/${encoded}`;
}
