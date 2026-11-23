// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@upstash/redis", () => ({ Redis: class {} }));
vi.mock("@upstash/ratelimit", () => ({ Ratelimit: class { static slidingWindow() { return {}; } } }));

import { checkAbuse, type AbuseDeps } from "@/lib/security/anti-abuse";

function deps(over: {
  ip?: "ok" | "limited" | "unavailable";
  turnstile?: "ok" | "config" | "rejected" | "missing_token" | "unreachable";
  email?: "ok" | "limited" | "unavailable";
}) {
  const calls: string[] = [];
  const d: AbuseDeps = {
    rateLimit: vi.fn(async (scope: string) => {
      calls.push(scope);
      const mode = scope.endsWith("-ip") ? (over.ip ?? "ok") : (over.email ?? "ok");
      return mode === "ok" ? { ok: true } : { ok: false, reason: mode };
    }) as unknown as AbuseDeps["rateLimit"],
    turnstile: vi.fn(async () => {
      calls.push("turnstile");
      const t = over.turnstile ?? "ok";
      return t === "ok" ? { ok: true } : { ok: false, reason: t };
    }) as unknown as AbuseDeps["turnstile"],
  };
  return { d, calls };
}

const input = { scope: "interest" as const, ip: "1.2.3.4", email: "a@b.it", turnstileToken: "tok" };

describe("checkAbuse", () => {
  it("tutto ok: IP, poi Turnstile, poi email (in quest'ordine)", async () => {
    const { d, calls } = deps({});
    expect(await checkAbuse(input, d)).toEqual({ ok: true });
    expect(calls).toEqual(["interest-ip", "turnstile", "interest-email"]);
  });

  it("limite IP superato: si ferma subito, senza consumare Turnstile ne quota email", async () => {
    const { d, calls } = deps({ ip: "limited" });
    expect(await checkAbuse(input, d)).toEqual({ ok: false, kind: "ip_limited" });
    expect(calls).toEqual(["interest-ip"]);
  });

  it("Turnstile non superato: la quota email non viene consumata", async () => {
    const { d, calls } = deps({ turnstile: "rejected" });
    expect(await checkAbuse(input, d)).toEqual({ ok: false, kind: "turnstile" });
    expect(calls).toEqual(["interest-ip", "turnstile"]);
  });

  it("chiavi Turnstile mancanti in produzione: unavailable (errore esplicito)", async () => {
    const { d } = deps({ turnstile: "config" });
    expect(await checkAbuse(input, d)).toEqual({ ok: false, kind: "unavailable" });
  });

  it("limite email superato: email_limited", async () => {
    const { d } = deps({ email: "limited" });
    expect(await checkAbuse(input, d)).toEqual({ ok: false, kind: "email_limited" });
  });

  it("Redis non disponibile: unavailable, sia per IP sia per email", async () => {
    expect(await checkAbuse(input, deps({ ip: "unavailable" }).d)).toEqual({ ok: false, kind: "unavailable" });
    expect(await checkAbuse(input, deps({ email: "unavailable" }).d)).toEqual({ ok: false, kind: "unavailable" });
  });

  it("IP sconosciuto: usa il bucket 'unknown' e passa il token a Turnstile", async () => {
    const { d } = deps({});
    await checkAbuse({ ...input, ip: null }, d);
    expect(d.rateLimit).toHaveBeenNthCalledWith(1, "interest-ip", "unknown");
    expect(d.turnstile).toHaveBeenCalledWith("tok", null);
  });

  it("scope login usa quote separate", async () => {
    const { d, calls } = deps({});
    await checkAbuse({ ...input, scope: "login" }, d);
    expect(calls).toEqual(["login-ip", "turnstile", "login-email"]);
  });
});
