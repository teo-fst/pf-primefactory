import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redis = {
  get: vi.fn(),
  set: vi.fn(),
  scan: vi.fn(),
  del: vi.fn(),
};
const RedisCtor = vi.fn(function () {
  return redis;
});

vi.mock("@upstash/redis", () => ({ Redis: RedisCtor }));

async function loadCache() {
  vi.resetModules();
  return import("@/lib/content/cache");
}

describe("cached", () => {
  beforeEach(() => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", '  "https://redis.example"  ');
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "'token-di-prova'");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    redis.get.mockReset();
    redis.set.mockReset();
    redis.scan.mockReset();
    redis.del.mockReset();
    RedisCtor.mockClear();
  });

  it("senza variabili Upstash chiama direttamente la funzione", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const { cached } = await loadCache();
    const fn = vi.fn().mockResolvedValue({ a: 1 });
    expect(await cached("k", 300, fn)).toEqual({ a: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(RedisCtor).not.toHaveBeenCalled();
  });

  it("toglie virgolette e spazi dai valori letti dall'ambiente", async () => {
    redis.get.mockResolvedValue(null);
    const { cached } = await loadCache();
    await cached("k", 300, async () => 1);
    expect(RedisCtor).toHaveBeenCalledWith({
      url: "https://redis.example",
      token: "token-di-prova",
    });
  });

  it("restituisce il valore in cache senza chiamare la funzione", async () => {
    redis.get.mockResolvedValue({ da: "cache" });
    const { cached } = await loadCache();
    const fn = vi.fn();
    expect(await cached("k", 300, fn)).toEqual({ da: "cache" });
    expect(fn).not.toHaveBeenCalled();
    expect(redis.get).toHaveBeenCalledWith("pf:k");
  });

  it("in caso di miss calcola il valore e lo salva con TTL", async () => {
    redis.get.mockResolvedValue(null);
    redis.set.mockResolvedValue("OK");
    const { cached } = await loadCache();
    const value = await cached("k", 300, async () => ["x"]);
    expect(value).toEqual(["x"]);
    expect(redis.set).toHaveBeenCalledWith("pf:k", ["x"], { ex: 300 });
  });

  it("se Redis fallisce in lettura e scrittura restituisce comunque il valore", async () => {
    redis.get.mockRejectedValue(new Error("giu"));
    redis.set.mockRejectedValue(new Error("giu"));
    const { cached } = await loadCache();
    expect(await cached("k", 300, async () => "ok")).toBe("ok");
  });
});

describe("invalidateCache", () => {
  beforeEach(() => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    redis.scan.mockReset();
    redis.del.mockReset();
  });

  it("elimina le chiavi con il prefisso indicato, anche su piu pagine di scan", async () => {
    redis.scan
      .mockResolvedValueOnce(["7", ["pf:texts:it", "pf:texts:en"]])
      .mockResolvedValueOnce(["0", ["pf:texts:fr"]]);
    redis.del.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    const { invalidateCache } = await loadCache();
    expect(await invalidateCache("texts:")).toBe(3);
    expect(redis.scan).toHaveBeenNthCalledWith(1, "0", { match: "pf:texts:*", count: 100 });
    expect(redis.scan).toHaveBeenNthCalledWith(2, "7", { match: "pf:texts:*", count: 100 });
  });

  it("restituisce 0 se Redis non risponde", async () => {
    redis.scan.mockRejectedValue(new Error("giu"));
    const { invalidateCache } = await loadCache();
    expect(await invalidateCache("texts:")).toBe(0);
  });
});
