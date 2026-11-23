import { isValidBearer } from "@/lib/notify/cron-auth";
import { runNotifyBatch } from "@/lib/notify";
import { readEnv } from "@/lib/env";

// POST /api/cron/notifiche — processa un lotto dell'outbox delle notifiche (F1.10).
// Protetto da "Authorization: Bearer <CRON_SECRET>". Lo chiama un cron trigger ogni 5 minuti
// (ops/keepalive-worker). Risponde solo con numeri, mai con dati delle richieste.
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const secret = readEnv("CRON_SECRET");
  if (!secret) {
    console.error("[notify] CRON_SECRET non configurato: endpoint disattivato");
    return Response.json({ error: "not_configured" }, { status: 503 });
  }
  if (!(await isValidBearer(request.headers.get("authorization"), secret))) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  }
  try {
    const run = await runNotifyBatch();
    return Response.json(run, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("[notify] lotto non elaborato (errore nel database o nella configurazione)");
    return Response.json({ error: "batch_failed" }, { status: 500 });
  }
}
