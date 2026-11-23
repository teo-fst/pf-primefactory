// Lettura delle variabili d'ambiente. Toglie spazi e virgolette attorno al valore
// (alcuni file .env hanno i valori tra virgolette) e tratta il vuoto come "non impostata".
export function cleanEnvValue(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const value = raw.trim().replace(/^(["'])(.*)\1$/, "$2").trim();
  return value === "" ? undefined : value;
}

// Segreti e variabili di sola lettura lato server: letti a runtime da process.env.
export function readEnv(
  name: string,
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  return cleanEnvValue(env[name]);
}

// Le variabili NEXT_PUBLIC_* vanno scritte con l'accesso diretto `process.env.NEXT_PUBLIC_X`:
// Next le sostituisce con il valore al momento della build. Con un nome dinamico (env[name])
// su Cloudflare Workers risulterebbero vuote, perche li esistono solo i segreti del Worker.
export const publicEnv = {
  supabaseUrl: () => cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: () => cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  turnstileSiteKey: () => cleanEnvValue(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
};

export function isProduction(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV === "production";
}
