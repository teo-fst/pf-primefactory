import { hasLocale } from "next-intl";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

// Logout: POST da un form (mai GET, così un link o un'immagine di terzi non può disconnettere l'utente).
// Controllo di origine: se il browser indica un Origin, deve coincidere con l'host del sito.
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin) {
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      // Origin non valido
    }
    if (!host || originHost !== host) return new NextResponse(null, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const rawLocale = form?.get("locale");
  const locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;

  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });

  return new NextResponse(null, {
    status: 303,
    headers: { Location: `/${locale}`, "Cache-Control": "no-store" },
  });
}
