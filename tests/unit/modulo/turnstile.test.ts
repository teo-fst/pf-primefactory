// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getTurnstileSiteKey,
  resolveTurnstileKeys,
  TURNSTILE_TEST_SECRET_KEY,
  TURNSTILE_TEST_SITE_KEY,
  verifyTurnstile,
} from "@/lib/security/turnstile";

function fakeFetch(body: unknown, init: { ok?: boolean } = {}) {
  return vi.fn(async () => ({ ok: init.ok ?? true, json: async () => body }) as unknown as Response);
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
  vi.stubEnv("TURNSTILE_SECRET_KEY", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("chiavi Turnstile", () => {
  it("in sviluppo senza chiavi usa quelle di test ufficiali Cloudflare", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(resolveTurnstileKeys()).toEqual({
      siteKey: "1x00000000000000000000AA",
      secretKey: "1x0000000000000000000000000000000AA",
    });
    expect(TURNSTILE_TEST_SITE_KEY).toBe("1x00000000000000000000AA");
    expect(TURNSTILE_TEST_SECRET_KEY).toBe("1x0000000000000000000000000000000AA");
    expect(getTurnstileSiteKey()).toBe("1x00000000000000000000AA");
  });

  it("in produzione senza chiavi non c'è nessuna chiave", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(resolveTurnstileKeys()).toBeNull();
    expect(getTurnstileSiteKey()).toBeNull();
  });

  it("in produzione con una sola chiave: ancora nulla (niente coppie miste)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "segreto-vero");
    expect(resolveTurnstileKeys()).toBeNull();
  });

  it("usa le chiavi configurate, anche con virgolette attorno", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", '"0xSITE"');
    vi.stubEnv("TURNSTILE_SECRET_KEY", "0xSECRET");
    expect(resolveTurnstileKeys()).toEqual({ siteKey: "0xSITE", secretKey: "0xSECRET" });
  });
});

describe("verifyTurnstile", () => {
  it("produzione senza chiavi: errore esplicito (config), nessuna chiamata di rete", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const fetchImpl = fakeFetch({ success: true });
    expect(await verifyTurnstile("token", "1.2.3.4", { fetchImpl })).toEqual({ ok: false, reason: "config" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("token mancante o enorme: missing_token, nessuna chiamata di rete", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const fetchImpl = fakeFetch({ success: true });
    for (const token of [null, undefined, "", "x".repeat(3000)]) {
      expect(await verifyTurnstile(token, null, { fetchImpl })).toEqual({ ok: false, reason: "missing_token" });
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("success true: ok, e invia segreto, token e IP a Cloudflare", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const fetchImpl = fakeFetch({ success: true });
    expect(await verifyTurnstile("XXXX.DUMMY.TOKEN.XXXX", "203.0.113.7", { fetchImpl })).toEqual({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, { method: string; body: URLSearchParams }];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(init.method).toBe("POST");
    expect(init.body.get("secret")).toBe(TURNSTILE_TEST_SECRET_KEY);
    expect(init.body.get("response")).toBe("XXXX.DUMMY.TOKEN.XXXX");
    expect(init.body.get("remoteip")).toBe("203.0.113.7");
  });

  it("non manda remoteip se l'IP è sconosciuto", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const fetchImpl = fakeFetch({ success: true });
    await verifyTurnstile("t", "unknown", { fetchImpl });
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, { body: URLSearchParams }];
    expect(init.body.has("remoteip")).toBe(false);
  });

  it("success false: rejected", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const fetchImpl = fakeFetch({ success: false, "error-codes": ["invalid-input-response"] });
    expect(await verifyTurnstile("t", null, { fetchImpl })).toEqual({ ok: false, reason: "rejected" });
  });

  it("risposta senza success=true (es. stringa o assente) non passa", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(await verifyTurnstile("t", null, { fetchImpl: fakeFetch({ success: "true" }) })).toEqual({ ok: false, reason: "rejected" });
    expect(await verifyTurnstile("t", null, { fetchImpl: fakeFetch({}) })).toEqual({ ok: false, reason: "rejected" });
  });

  it("errore HTTP o di rete: unreachable (non passa mai)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(await verifyTurnstile("t", null, { fetchImpl: fakeFetch({}, { ok: false }) })).toEqual({ ok: false, reason: "unreachable" });
    const boom = vi.fn(async () => {
      throw new Error("rete giu");
    });
    expect(await verifyTurnstile("t", null, { fetchImpl: boom as unknown as typeof fetch })).toEqual({ ok: false, reason: "unreachable" });
  });
});
