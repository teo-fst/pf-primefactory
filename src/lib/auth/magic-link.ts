import "server-only";
import { headers } from "next/headers";
import { createPublicClient } from "@/lib/supabase/public";

// Origine del sito dalla richiesta in corso (serve a costruire emailRedirectTo).
// Supabase accetta il redirect solo se è nella lista "Redirect URLs" del progetto: un valore
// falsificato viene ignorato e si usa il Site URL. La rotta /auth/confirm usa comunque solo la lingua.
async function getRequestOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin && /^https?:\/\/[^/\s]+$/.test(origin)) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Chiede a Supabase di inviare il magic link a un utente GIÀ esistente (shouldCreateUser: false).
 * Il risultato non dipende dall'esistenza dell'account: chi chiama non deve mai rivelarlo.
 * Gli errori (utente inesistente, limite di invio, SMTP) vengono registrati senza dati personali e ignorati.
 */
export async function sendMagicLink(email: string, locale: string): Promise<void> {
  const client = createPublicClient();
  if (!client) {
    console.error("[magic-link] Supabase non configurato");
    return;
  }
  const origin = await getRequestOrigin();
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/${locale}/area-clienti`,
    },
  });
  if (error) console.warn(`[magic-link] invio non riuscito (${error.code ?? error.status ?? "errore"})`);
}
