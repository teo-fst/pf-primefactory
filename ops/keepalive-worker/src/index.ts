// Worker Cloudflare: ping periodico a Supabase per evitare la pausa del piano gratuito.
// Nessun valore nel codice: URL e chiave arrivano dalle variabili del Worker.

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
}

async function ping(env: Env): Promise<Response> {
  const base = env.SUPABASE_URL.replace(/\/+$/, "");
  const res = await fetch(`${base}/rest/v1/`, {
    method: "GET",
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY },
  });
  console.log(`keepalive: ${res.status}`);
  return res;
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(ping(env));
  },

  // Utile per provare a mano: GET sul worker esegue lo stesso ping.
  async fetch(_request: Request, env: Env): Promise<Response> {
    const res = await ping(env);
    return new Response(`status ${res.status}`, { status: res.ok ? 200 : 502 });
  },
} satisfies ExportedHandler<Env>;
