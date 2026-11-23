import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { guardAdminRoute } from "@/lib/admin/guard";
import { createClient } from "@/lib/supabase/server";

// Download di un file allegato a una richiesta (Q10). Il bucket `request-files` è privato:
// l'admin non riceve mai un indirizzo permanente, ma un URL firmato che vale 60 secondi.
// 1) ruolo admin ricontrollato qui; 2) il file deve appartenere alla richiesta indicata;
// 3) l'URL firmato lo crea il client con la sessione dell'admin: lo permette la policy di Storage.
const SIGNED_URL_SECONDS = 60;

type Context = { params: Promise<{ locale: string; id: string; fileId: string }> };

export async function GET(_request: NextRequest, context: Context) {
  const guard = await guardAdminRoute();
  if (guard instanceof NextResponse) return guard;

  const { id, fileId } = await context.params;
  if (!z.uuid().safeParse(id).success || !/^\d{1,18}$/.test(fileId)) {
    return new NextResponse(null, { status: 404 });
  }

  const supabase = await createClient();
  const { data: file } = await supabase
    .from("request_files")
    .select("storage_path, original_name")
    .eq("id", Number(fileId))
    .eq("request_id", id)
    .maybeSingle();
  if (!file) return new NextResponse(null, { status: 404 });

  const { data, error } = await supabase.storage
    .from("request-files")
    .createSignedUrl(file.storage_path, SIGNED_URL_SECONDS, { download: file.original_name });
  if (error || !data?.signedUrl) return new NextResponse(null, { status: 502 });

  return new NextResponse(null, {
    status: 303,
    headers: { Location: data.signedUrl, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
