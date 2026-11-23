// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { processLogin, type LoginDeps } from "@/lib/auth/login";
import type { AbuseOutcome } from "@/lib/security/anti-abuse";

function setup(abuse: AbuseOutcome = { ok: true }, magicLinkFails = false) {
  const sendMagicLink = vi.fn(async () => {
    if (magicLinkFails) throw new Error("smtp");
  });
  const checkAbuse = vi.fn(async () => abuse);
  const deps: LoginDeps = { checkAbuse, sendMagicLink };
  return { deps, sendMagicLink, checkAbuse };
}

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("processLogin", () => {
  it("email valida: invia il link e risponde 'sent'", async () => {
    const s = setup();
    const out = await processLogin(form({ email: "  Mario@Example.com ", locale: "en", "cf-turnstile-response": "tok" }), "1.2.3.4", s.deps);
    expect(out).toEqual({ status: "sent" });
    expect(s.sendMagicLink).toHaveBeenCalledWith("mario@example.com", "en");
    expect(s.checkAbuse).toHaveBeenCalledWith({ scope: "login", ip: "1.2.3.4", email: "mario@example.com", turnstileToken: "tok" });
  });

  it("stessa risposta se l'invio fallisce (account inesistente, SMTP): niente enumerazione", async () => {
    const ok = await processLogin(form({ email: "a@b.it" }), null, setup().deps);
    const ko = await processLogin(form({ email: "a@b.it" }), null, setup({ ok: true }, true).deps);
    expect(ko).toEqual(ok);
    expect(ok).toEqual({ status: "sent" });
  });

  it("limite per email superato: 'sent' senza inviare nulla", async () => {
    const s = setup({ ok: false, kind: "email_limited" });
    expect(await processLogin(form({ email: "a@b.it" }), null, s.deps)).toEqual({ status: "sent" });
    expect(s.sendMagicLink).not.toHaveBeenCalled();
  });

  it("honeypot: 'sent' senza fare nulla", async () => {
    const s = setup();
    expect(await processLogin(form({ email: "a@b.it", company_website: "x" }), null, s.deps)).toEqual({ status: "sent" });
    expect(s.checkAbuse).not.toHaveBeenCalled();
    expect(s.sendMagicLink).not.toHaveBeenCalled();
  });

  it("email vuota o non valida: errore di campo, nessun controllo anti-abuse", async () => {
    const s = setup();
    expect(await processLogin(form({ email: "" }), null, s.deps)).toMatchObject({ status: "invalid", error: "required" });
    expect(await processLogin(form({ email: "nonmail" }), null, s.deps)).toMatchObject({ status: "invalid", error: "invalid_email" });
    expect(await processLogin(form({ email: "a".repeat(250) + "@b.it" }), null, s.deps)).toMatchObject({ status: "invalid", error: "too_long" });
    expect(s.checkAbuse).not.toHaveBeenCalled();
  });

  it("Turnstile, IP e servizio non disponibile: errori espliciti", async () => {
    expect(await processLogin(form({ email: "a@b.it" }), null, setup({ ok: false, kind: "turnstile" }).deps)).toMatchObject({ status: "error", code: "turnstile" });
    expect(await processLogin(form({ email: "a@b.it" }), null, setup({ ok: false, kind: "ip_limited" }).deps)).toMatchObject({ status: "error", code: "rate_limited" });
    expect(await processLogin(form({ email: "a@b.it" }), null, setup({ ok: false, kind: "unavailable" }).deps)).toMatchObject({ status: "error", code: "unavailable" });
  });
});
