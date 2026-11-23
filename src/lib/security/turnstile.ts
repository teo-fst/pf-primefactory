import "server-only";
import { isProduction, publicEnv, readEnv } from "@/lib/env";

// Cloudflare Turnstile: widget nel browser + verifica del token lato server.
// Chiavi di test ufficiali Cloudflare (sempre "superato"): https://developers.cloudflare.com/turnstile/troubleshooting/testing/
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
export const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TOKEN_LENGTH = 2048;

export type TurnstileKeys = { siteKey: string; secretKey: string };

export type TurnstileResult =
  | { ok: true }
  | { ok: false; reason: "config" | "missing_token" | "rejected" | "unreachable" };

/**
 * Chiavi da usare. Se mancano e NON siamo in produzione: chiavi di test ufficiali.
 * In produzione senza chiavi: null (la verifica fallisce in modo esplicito, mai "passa lo stesso").
 * La site key arriva da NEXT_PUBLIC_TURNSTILE_SITE_KEY (valore fissato in build) e il segreto da
 * TURNSTILE_SECRET_KEY. Se ne manca una sola, si considerano entrambe mancanti: coppie miste non funzionano.
 */
export function resolveTurnstileKeys(): TurnstileKeys | null {
  const siteKey = publicEnv.turnstileSiteKey();
  const secretKey = readEnv("TURNSTILE_SECRET_KEY");
  if (siteKey && secretKey) return { siteKey, secretKey };
  if (!isProduction()) {
    return { siteKey: TURNSTILE_TEST_SITE_KEY, secretKey: TURNSTILE_TEST_SECRET_KEY };
  }
  return null;
}

/** Site key da passare al widget nel browser (null = widget non disponibile, solo produzione senza chiavi). */
export function getTurnstileSiteKey(): string | null {
  return resolveTurnstileKeys()?.siteKey ?? null;
}

export async function verifyTurnstile(
  token: string | null | undefined,
  ip: string | null,
  options: { fetchImpl?: typeof fetch } = {},
): Promise<TurnstileResult> {
  const keys = resolveTurnstileKeys();
  if (!keys) {
    console.error("[turnstile] chiavi mancanti in produzione: NEXT_PUBLIC_TURNSTILE_SITE_KEY e TURNSTILE_SECRET_KEY");
    return { ok: false, reason: "config" };
  }
  if (typeof token !== "string" || token === "" || token.length > MAX_TOKEN_LENGTH) {
    return { ok: false, reason: "missing_token" };
  }

  const body = new URLSearchParams({ secret: keys.secretKey, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  try {
    const res = await (options.fetchImpl ?? fetch)(VERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { ok: false, reason: "unreachable" };
    const data = (await res.json()) as { success?: boolean };
    return data.success === true ? { ok: true } : { ok: false, reason: "rejected" };
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}
