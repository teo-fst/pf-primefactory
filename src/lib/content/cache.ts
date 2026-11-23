import "server-only";
import { Redis } from "@upstash/redis";
import { readEnv } from "./env";

/** Durata predefinita della cache dei contenuti pubblici (Q17). */
export const CACHE_TTL_SECONDS = 300;

const KEY_PREFIX = "pf:";

let client: Redis | null | undefined;

function getRedis(): Redis | null {
  if (client !== undefined) return client;
  const url = readEnv("UPSTASH_REDIS_REST_URL");
  const token = readEnv("UPSTASH_REDIS_REST_TOKEN");
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}

/** Solo per i test: azzera il client in memoria. */
export function resetCacheClient() {
  client = undefined;
}

/**
 * Restituisce il valore in cache sotto `key`, oppure lo calcola con `fn` e lo salva per `ttlSeconds`.
 * Senza variabili Upstash, o se Redis non risponde, chiama direttamente `fn`: la pagina non si rompe.
 * Il valore deve essere serializzabile in JSON e diverso da null/undefined.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const redis = getRedis();
  if (!redis) return fn();
  const fullKey = KEY_PREFIX + key;

  try {
    const hit = await redis.get<T>(fullKey);
    if (hit !== null && hit !== undefined) return hit;
  } catch (error) {
    console.warn("Cache Redis non disponibile in lettura:", errorMessage(error));
  }

  const value = await fn();

  if (value !== null && value !== undefined) {
    try {
      await redis.set(fullKey, value, { ex: ttlSeconds });
    } catch (error) {
      console.warn("Cache Redis non disponibile in scrittura:", errorMessage(error));
    }
  }
  return value;
}

/**
 * Elimina dalla cache tutte le chiavi che iniziano con `prefix` (es. "texts:").
 * Pensata per il futuro pannello admin: dopo una modifica invalida i contenuti.
 * Restituisce il numero di chiavi eliminate; 0 se la cache non e attiva o non risponde.
 */
export async function invalidateCache(prefix = ""): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  let deleted = 0;
  try {
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(cursor, {
        match: `${KEY_PREFIX}${prefix}*`,
        count: 100,
      });
      cursor = String(next);
      if (keys.length > 0) deleted += await redis.del(...keys);
    } while (cursor !== "0");
  } catch (error) {
    console.warn("Invalidazione cache Redis non riuscita:", errorMessage(error));
  }
  return deleted;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
