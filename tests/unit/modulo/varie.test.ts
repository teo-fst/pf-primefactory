// @vitest-environment node
import { describe, expect, it } from "vitest";
import enMessages from "../../../messages/en.json";
import itMessages from "../../../messages/it.json";
import { roleAllows, type AppRole } from "@/lib/auth/roles";
import { cleanEnvValue } from "@/lib/env";
import { getClientIp } from "@/lib/security/client-ip";

function headers(map: Record<string, string>) {
  return { get: (name: string) => map[name.toLowerCase()] ?? null };
}

describe("roleAllows", () => {
  it("admin passa ovunque", () => {
    expect(roleAllows("admin", "admin")).toBe(true);
    expect(roleAllows("admin", "operatore")).toBe(true);
  });
  it("operatore solo dove richiesto operatore", () => {
    expect(roleAllows("operatore", "operatore")).toBe(true);
    expect(roleAllows("operatore", "admin")).toBe(false);
  });
  it("cliente, assente o sconosciuto non passano mai", () => {
    const roles: Array<AppRole | null | undefined> = ["cliente", null, undefined, "superuser" as AppRole];
    for (const role of roles) {
      expect(roleAllows(role, "operatore")).toBe(false);
      expect(roleAllows(role, "admin")).toBe(false);
    }
  });
});

describe("cleanEnvValue", () => {
  it("toglie spazi e virgolette attorno al valore", () => {
    expect(cleanEnvValue('"https://x.upstash.io"')).toBe("https://x.upstash.io");
    expect(cleanEnvValue("'tok'")).toBe("tok");
    expect(cleanEnvValue("  valore ")).toBe("valore");
  });
  it("vuoto e assente = non impostata", () => {
    expect(cleanEnvValue("")).toBeUndefined();
    expect(cleanEnvValue('""')).toBeUndefined();
    expect(cleanEnvValue(undefined)).toBeUndefined();
  });
});

describe("getClientIp", () => {
  it("preferisce cf-connecting-ip (non falsificabile dietro Cloudflare)", () => {
    expect(getClientIp(headers({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "6.6.6.6" }))).toBe("203.0.113.7");
  });
  it("in sviluppo ripiega su x-real-ip e x-forwarded-for (primo valore)", () => {
    expect(getClientIp(headers({ "x-real-ip": "10.0.0.1" }))).toBe("10.0.0.1");
    expect(getClientIp(headers({ "x-forwarded-for": "10.0.0.2, 10.0.0.3" }))).toBe("10.0.0.2");
    expect(getClientIp(headers({}))).toBeNull();
  });
});

function keyShape(obj: unknown): unknown {
  if (typeof obj !== "object" || obj === null) return typeof obj;
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, keyShape(v)]));
}

describe("traduzioni del modulo", () => {
  it("it e en hanno le stesse chiavi in interestForm, auth e account", () => {
    for (const ns of ["interestForm", "auth", "account"] as const) {
      expect(keyShape(enMessages[ns])).toEqual(keyShape(itMessages[ns]));
    }
  });

  it("i codici di errore dei campi hanno una traduzione", () => {
    const codes = [
      "required", "too_short", "too_long", "invalid_email", "invalid_phone", "invalid_date",
      "date_past", "consent_required", "invalid_line", "invalid_number", "invalid_option",
    ];
    for (const messages of [itMessages, enMessages]) {
      for (const code of codes) expect(messages.interestForm.errors).toHaveProperty(code);
      for (const code of ["turnstile", "rate_limited", "unavailable", "server"]) {
        expect(messages.interestForm.formErrors).toHaveProperty(code);
        expect(messages.auth.errors).toHaveProperty(code);
      }
    }
  });
});
