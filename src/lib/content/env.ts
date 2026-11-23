// Le variabili NEXT_PUBLIC_* vengono sostituite da Next.js al momento della build solo
// se scritte per esteso (process.env.NEXT_PUBLIC_X). Con un nome dinamico, su Cloudflare
// Workers resterebbero vuote: per questo sono elencate qui una per una.
const buildTime: Record<string, string | undefined> = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
};

/**
 * Legge una variabile d'ambiente togliendo spazi e virgolette esterne:
 * nei file .env i valori possono essere scritti tra apici ("valore").
 * Le variabili solo-server (es. UPSTASH_*) si leggono a ogni chiamata, non all'avvio.
 */
export function readEnv(name: string): string | undefined {
  const raw = buildTime[name] || process.env[name];
  if (!raw) return undefined;
  const cleaned = raw.trim().replace(/^["']+|["']+$/g, "").trim();
  return cleaned || undefined;
}
