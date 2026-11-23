import { NextResponse, type NextRequest } from "next/server";
import { guardAdminRoute } from "@/lib/admin/guard";
import { eventSignupUrl, isQrLocale, qrSvg } from "@/lib/admin/qr";
import { createClient } from "@/lib/supabase/server";

// Scarica il QR di un evento in SVG (Q39). ?lang=it|en sceglie la lingua della pagina di destinazione.
// Solo admin: il ruolo si ricontrolla qui e l'evento si legge con la sessione (RLS).
type Context = { params: Promise<{ locale: string; id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const guard = await guardAdminRoute();
  if (guard instanceof NextResponse) return guard;

  const { id } = await context.params;
  if (!/^\d{1,18}$/.test(id)) return new NextResponse(null, { status: 404 });
  const requested = request.nextUrl.searchParams.get("lang");
  const lang = isQrLocale(requested) ? requested : "it";

  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("source_code").eq("id", Number(id)).maybeSingle();
  if (!event) return new NextResponse(null, { status: 404 });

  const svg = qrSvg(eventSignupUrl(lang, event.source_code));
  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="qr-${event.source_code}-${lang}.svg"`,
      "Cache-Control": "no-store",
    },
  });
}
