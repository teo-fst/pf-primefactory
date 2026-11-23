import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { isProduction, readEnv } from "@/lib/env";

// Rate limit su Upstash Redis (Q17). Le chiavi in Redis sono hash SHA-256 di IP ed email:
// nessun dato personale in chiaro finisce su Upstash.

export type RateScope = "interest-ip" | "interest-email" | "login-ip" | "login-email";

type Window = Parameters<typeof Ratelimit.slidingWindow>[1];

export const RATE_LIMITS: Record<RateScope, { max: number; window: Window }> = {
  "interest-ip": { max: 5, window: "1 h" },
  "interest-email": { max: 3, window: "1 d" },
  "login-ip": { max: 10, window: "1 h" },
  "login-email": { max: 5, window: "1 h" },
};

export type RateLimitResult = { ok: true } | { ok: false; reason: "limited" | "unavailable" };

const limiters = new Map<RateScope, Ratelimit>();
let warnedNoRedis = false;

function getLimiter(scope: RateScope): Ratelimit | null {
  const url = readEnv("UPSTASH_REDIS_REST_URL");
  const token = readEnv("UPSTASH_REDIS_REST_TOKEN");
  if (!url || !token) return null;

  let limiter = limiters.get(scope);
  if (!limiter) {
    const { max, window } = RATE_LIMITS[scope];
    limiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(max, window),
      prefix: `pf:rl:${scope}`,
    });
    limiters.set(scope, limiter);
  }
  return limiter;
}

export async function hashKey(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Controlla e consuma un tentativo.
 * - Redis non configurato: in sviluppo lascia passare con un avviso, in produzione blocca.
 * - Errore di rete verso Redis: stessa regola (in produzione blocca, "fail closed").
 */
export async function checkRateLimit(scope: RateScope, rawKey: string): Promise<RateLimitResult> {
  const limiter = getLimiter(scope);
  if (!limiter) {
    if (isProduction()) {
      console.error("[rate-limit] Upstash non configurato in produzione: richiesta bloccata");
      return { ok: false, reason: "unavailable" };
    }
    if (!warnedNoRedis) {
      warnedNoRedis = true;
      console.warn("[rate-limit] Upstash non configurato: rate limit DISATTIVATO (solo sviluppo)");
    }
    return { ok: true };
  }

  try {
    const { success } = await limiter.limit(await hashKey(rawKey));
    return success ? { ok: true } : { ok: false, reason: "limited" };
  } catch {
    if (isProduction()) {
      console.error(`[rate-limit] errore Redis (${scope}): richiesta bloccata`);
      return { ok: false, reason: "unavailable" };
    }
    console.warn(`[rate-limit] errore Redis (${scope}): in sviluppo lascio passare`);
    return { ok: true };
  }
}
