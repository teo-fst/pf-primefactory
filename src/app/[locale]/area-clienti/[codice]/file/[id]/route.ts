import { hasLocale } from "next-intl";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { STORAGE_BUCKET } from "@/lib/account/files";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

// Download di un proprio file: URL firmato di breve durata (60 secondi) generato dal server.
// Nessun file è pubblico. Il file si legge con la RLS: se non è del chiamante, la riga non esiste.

const SIGNED_URL_SECONDS = 60;
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ locale: string; codice: string; id: string }> },
) {
  const { locale, codice, id } = await ctx.params;
  if (!hasLocale(routing.locales, locale) || !/^\d{1,18}$/.test(id)) {
    return new NextResponse(null, { status: 404, headers: NO_STORE });
  }

  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse(null, { status: 303, headers: { ...NO_STORE, Location: `/${locale}/accedi` } });
  }

  const supabase = await createClient();
  const { data: file } = await supabase
    .from("request_files")
    .select("storage_path, original_name, requests!inner(public_code, customer_id)")
    .eq("id", Number(id))
    .eq("requests.customer_id", user.id)
    .eq("requests.public_code", codice)
    .maybeSingle();
  if (!file) return new NextResponse(null, { status: 404, headers: NO_STORE });

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(file.storage_path, SIGNED_URL_SECONDS, { download: file.original_name });
  if (error || !data?.signedUrl) return new NextResponse(null, { status: 404, headers: NO_STORE });

  return new NextResponse(null, {
    status: 302,
    headers: { ...NO_STORE, Location: data.signedUrl, "Referrer-Policy": "no-referrer" },
  });
}
