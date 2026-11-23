// Worker Cloudflare con due compiti pianificati (cron trigger):
//   1. ogni 3 giorni: ping a Supabase per evitare la pausa del piano gratuito (Q29);
//   2. ogni 5 minuti: chiama POST /api/cron/notifiche del sito per consegnare le notifiche in coda (F1.10).
// Nessun valore nel codice: URL, chiavi e segreto arrivano dalle variabili del Worker.

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  // Notifiche (F1.10). CRON_SECRET deve coincidere con quello del Worker del sito.
  NOTIFY_URL?: string; // es. https://<dominio>/api/cron/notifiche
  CRON_SECRET?: string;
  // Alternativa a NOTIFY_URL: service binding verso il Worker del sito (vedi wrangler.jsonc e README).
  WEB?: Fetcher;
}

// Deve coincidere con la seconda voce di "triggers.crons" in wrangler.jsonc.
const NOTIFY_CRON = "*/5 * * * *";

async function ping(env: Env): Promise<Response> {
  const base = env.SUPABASE_URL.replace(/\/+$/, "");
  const res = await fetch(`${base}/rest/v1/`, {
    method: "GET",
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY },
  });
  console.log(`keepalive: ${res.status}`);
  return res;
}

// Chiama l'endpoint delle notifiche. Si registra solo lo stato HTTP: la risposta contiene solo conteggi,
// ma il segreto non va mai scritto nei log.
async function runNotify(env: Env): Promise<void> {
  if (!env.CRON_SECRET || (!env.WEB && !env.NOTIFY_URL)) {
    console.warn("notify: CRON_SECRET e NOTIFY_URL (o il binding WEB) non configurati, nessuna chiamata");
    return;
  }
  const init: RequestInit = { method: "POST", headers: { Authorization: `Bearer ${env.CRON_SECRET}` } };
  try {
    const res = env.WEB
      ? await env.WEB.fetch("https://web.internal/api/cron/notifiche", init)
      : await fetch(env.NOTIFY_URL as string, init);
    console.log(`notify: ${res.status}`);
    if (!res.ok) throw new Error(`notify: risposta ${res.status}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "notify: errore di rete");
    throw error; // il cron risulta fallito nel pannello Cloudflare
  }
}

export default {
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(controller.cron === NOTIFY_CRON ? runNotify(env) : ping(env));
  },

  // Utile per provare a mano: GET sul worker esegue lo stesso ping a Supabase.
  // Le notifiche non si possono far partire da qui: l'endpoint del sito richiede il segreto.
  async fetch(_request: Request, env: Env): Promise<Response> {
    const res = await ping(env);
    return new Response(`status ${res.status}`, { status: res.ok ? 200 : 502 });
  },
} satisfies ExportedHandler<Env>;
