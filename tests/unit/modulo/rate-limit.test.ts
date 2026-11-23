// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Finto Upstash: registra come viene configurato e risponde secondo `nextResult`.
const state = vi.hoisted(() => ({
  nextResult: { success: true } as { success: boolean } | Error,
  limitCalls: [] as string[],
  windows: [] as Array<[number, string]>,
  prefixes: [] as string[],
}));

vi.mock("@upstash/redis", () => ({ Redis: class {} }));
vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    prefix: string;
    constructor(opts: { prefix: string }) {
      this.prefix = opts.prefix;
      state.prefixes.push(opts.prefix);
    }
    static slidingWindow(max: number, window: string) {
      state.windows.push([max, window]);
      return { max, window };
    }
    async limit(key: string) {
      state.limitCalls.push(`${this.prefix}|${key}`);
      if (state.nextResult instanceof Error) throw state.nextResult;
      return state.nextResult;
    }
  }
  return { Ratelimit };
});

async function load() {
  vi.resetModules();
  return import("@/lib/security/rate-limit");
}

beforeEach(() => {
  state.nextResult = { success: true };
  state.limitCalls = [];
  state.windows = [];
  state.prefixes = [];
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("rate limit senza Redis", () => {
  it("in sviluppo lascia passare con un avviso (una volta sola)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { checkRateLimit } = await load();
    expect(await checkRateLimit("interest-ip", "1.2.3.4")).toEqual({ ok: true });
    expect(await checkRateLimit("interest-email", "a@b.it")).toEqual({ ok: true });
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(state.limitCalls).toHaveLength(0);
  });

  it("in produzione blocca", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { checkRateLimit } = await load();
    expect(await checkRateLimit("interest-ip", "1.2.3.4")).toEqual({ ok: false, reason: "unavailable" });
  });
});

describe("rate limit con Redis", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", '"https://redis.example.invalid"');
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", '"token-finto"');
  });

  it("limiti richiesti: IP 5/ora, email 3/giorno", async () => {
    const { checkRateLimit, RATE_LIMITS } = await load();
    expect(RATE_LIMITS["interest-ip"]).toEqual({ max: 5, window: "1 h" });
    expect(RATE_LIMITS["interest-email"]).toEqual({ max: 3, window: "1 d" });
    await checkRateLimit("interest-ip", "1.2.3.4");
    await checkRateLimit("interest-email", "a@b.it");
    expect(state.windows).toEqual([
      [5, "1 h"],
      [3, "1 d"],
    ]);
  });

  it("success true: ok; success false: limited", async () => {
    const { checkRateLimit } = await load();
    expect(await checkRateLimit("interest-ip", "1.2.3.4")).toEqual({ ok: true });
    state.nextResult = { success: false };
    expect(await checkRateLimit("interest-ip", "1.2.3.4")).toEqual({ ok: false, reason: "limited" });
  });

  it("su Redis finiscono solo hash: né IP né email in chiaro", async () => {
    const { checkRateLimit, hashKey } = await load();
    await checkRateLimit("interest-email", "mario.rossi@example.com");
    await checkRateLimit("interest-ip", "203.0.113.7");
    expect(state.limitCalls).toHaveLength(2);
    for (const call of state.limitCalls) {
      expect(call).not.toContain("mario");
      expect(call).not.toContain("example.com");
      expect(call).not.toContain("203.0.113.7");
    }
    expect(state.limitCalls[0]).toBe(`pf:rl:interest-email|${await hashKey("mario.rossi@example.com")}`);
    expect(await hashKey("a")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("scope diversi hanno prefissi diversi (quote separate)", async () => {
    const { checkRateLimit } = await load();
    await checkRateLimit("interest-ip", "x");
    await checkRateLimit("login-ip", "x");
    expect(state.prefixes).toEqual(["pf:rl:interest-ip", "pf:rl:login-ip"]);
  });

  it("errore di Redis in produzione: blocca (fail closed)", async () => {
    const { checkRateLimit } = await load();
    state.nextResult = new Error("rete");
    expect(await checkRateLimit("interest-ip", "1.2.3.4")).toEqual({ ok: false, reason: "unavailable" });
  });

  it("errore di Redis in sviluppo: lascia passare con avviso", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { checkRateLimit } = await load();
    state.nextResult = new Error("rete");
    expect(await checkRateLimit("interest-ip", "1.2.3.4")).toEqual({ ok: true });
  });
});
