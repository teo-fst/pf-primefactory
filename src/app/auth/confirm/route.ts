import type { EmailOtpType } from "@supabase/supabase-js";
import { hasLocale } from "next-intl";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

// Conferma del magic link (flusso SSR con token_hash, consigliato dalla documentazione Supabase).
// Il link nell'email punta qui con ?token_hash=...&type=email&redirect_to=...
// A differenza del flusso PKCE (?code=), il token_hash si può convalidare anche se il link
// viene aperto da un altro dispositivo o browser, perché non serve il "code verifier" salvato
// nel browser che ha richiesto l'accesso.
//
// La rotta sta fuori da [locale] (percorso fisso /auth/confirm, come nel template email).
// Della destinazione si usa SOLO la lingua: niente redirect aperto verso indirizzi arbitrari.

// "invite": link dell'invito a un nuovo admin/operatore dal pannello (F1.9, Q37).
const OTP_TYPES: readonly EmailOtpType[] = ["email", "magiclink", "invite"];
const TOKEN_HASH_MAX = 512;

function localeFromRedirect(redirectTo: string | null) {
  if (redirectTo) {
    try {
      const segment = new URL(redirectTo, "http://localhost").pathname.split("/")[1];
      if (hasLocale(routing.locales, segment)) return segment;
    } catch {
      // URL non valido: lingua predefinita
    }
  }
  return routing.defaultLocale;
}

// Location relativa: evita problemi con host interni dietro a proxy e container.
function redirectTo(path: string) {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: path, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const locale = localeFromRedirect(params.get("redirect_to"));

  if (tokenHash && tokenHash.length <= TOKEN_HASH_MAX && type && OTP_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      // Chi arriva da un invito del pannello e ha il ruolo admin atterra sul pannello, gli altri nell'area clienti.
      // Il ruolo si legge dal database con la sessione appena creata (la RLS mostra a ciascuno il proprio profilo).
      if (type === "invite") {
        const { data } = await supabase.auth.getClaims();
        const userId = typeof data?.claims.sub === "string" ? data.claims.sub : null;
        const { data: profile } = userId
          ? await supabase.from("profiles").select("role").eq("id", userId).maybeSingle()
          : { data: null };
        if (profile?.role === "admin") return redirectTo(`/${locale}/admin`);
      }
      return redirectTo(`/${locale}/area-clienti`);
    }
    console.warn(`[auth/confirm] verifica non riuscita (${error.code ?? error.status ?? "errore"})`);
  }
  return redirectTo(`/${locale}/accedi?errore=link`);
}
