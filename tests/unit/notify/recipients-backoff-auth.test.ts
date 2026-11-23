// @vitest-environment node
import { describe, expect, it } from "vitest";
import { MAX_ATTEMPTS, backoffDelayMs, nextAttemptAt } from "@/lib/notify/backoff";
import { isValidBearer, parseBearer } from "@/lib/notify/cron-auth";
import { DELIVERY_PLAN, planDeliveries } from "@/lib/notify/recipients";
import { EVENT_TYPES } from "@/lib/notify/types";

describe("selezione dei destinatari per evento", () => {
  it("nuova richiesta: cliente + soci (email) + Telegram", () => {
    expect(planDeliveries("request_created")).toEqual(["customer_email", "admin_email", "telegram"]);
  });
  it("cambio stato: solo il cliente", () => {
    expect(planDeliveries("status_changed")).toEqual(["customer_email"]);
  });
  it("messaggio del cliente: solo i soci", () => {
    expect(planDeliveries("message_from_customer")).toEqual(["admin_email"]);
  });
  it("messaggio dell'admin: solo il cliente", () => {
    expect(planDeliveries("message_from_admin")).toEqual(["customer_email"]);
  });
  it("file caricato: soci (email + Telegram), mai il cliente", () => {
    expect(planDeliveries("file_uploaded")).toEqual(["admin_email", "telegram"]);
  });
  it("Telegram solo per nuova richiesta e file caricato (Q31)", () => {
    const withTelegram = EVENT_TYPES.filter((t) => DELIVERY_PLAN[t].includes("telegram"));
    expect(withTelegram).toEqual(["request_created", "file_uploaded"]);
  });
  it("ogni evento ha almeno un destinatario", () => {
    for (const type of EVENT_TYPES) expect(planDeliveries(type).length).toBeGreaterThan(0);
  });
});

describe("backoff", () => {
  it("attese crescenti dopo ogni fallimento", () => {
    expect(backoffDelayMs(1)).toBe(2 * 60_000);
    expect(backoffDelayMs(2)).toBe(10 * 60_000);
    expect(backoffDelayMs(3)).toBe(30 * 60_000);
    expect(backoffDelayMs(4)).toBe(120 * 60_000);
  });
  it("dopo il quinto tentativo non si riprova", () => {
    expect(MAX_ATTEMPTS).toBe(5);
    expect(backoffDelayMs(5)).toBeNull();
    expect(backoffDelayMs(9)).toBeNull();
  });
  it("valori strani ricadono sull'attesa minima", () => {
    expect(backoffDelayMs(0)).toBe(2 * 60_000);
    expect(backoffDelayMs(-3)).toBe(2 * 60_000);
    expect(backoffDelayMs(1.5)).toBe(2 * 60_000);
  });
  it("nextAttemptAt somma l'attesa all'ora corrente", () => {
    const now = new Date("2026-11-23T10:00:00Z");
    expect(nextAttemptAt(now, 2)?.toISOString()).toBe("2026-11-23T10:10:00.000Z");
    expect(nextAttemptAt(now, 5)).toBeNull();
  });
});

describe("verifica del bearer (cron)", () => {
  const secret = "prova-prova-prova-prova";

  it("estrae il token da un header ben formato", () => {
    expect(parseBearer("Bearer abc123")).toBe("abc123");
    expect(parseBearer("bearer abc123")).toBe("abc123");
    expect(parseBearer("Bearer")).toBeNull();
    expect(parseBearer("Basic abc123")).toBeNull();
    expect(parseBearer("Bearer a b")).toBeNull();
    expect(parseBearer(null)).toBeNull();
  });
  it("accetta solo il segreto esatto", async () => {
    expect(await isValidBearer(`Bearer ${secret}`, secret)).toBe(true);
  });
  it("rifiuta header assente, schema sbagliato, segreto sbagliato o con un carattere in più/meno", async () => {
    expect(await isValidBearer(null, secret)).toBe(false);
    expect(await isValidBearer("", secret)).toBe(false);
    expect(await isValidBearer(`Basic ${secret}`, secret)).toBe(false);
    expect(await isValidBearer("Bearer altro", secret)).toBe(false);
    expect(await isValidBearer(`Bearer ${secret}x`, secret)).toBe(false);
    expect(await isValidBearer(`Bearer ${secret.slice(0, -1)}`, secret)).toBe(false);
    expect(await isValidBearer(`Bearer ${secret.toUpperCase()}`, secret)).toBe(false);
  });
  it("senza segreto configurato nessuno passa, nemmeno con token vuoto o 'undefined'", async () => {
    expect(await isValidBearer(`Bearer ${secret}`, undefined)).toBe(false);
    expect(await isValidBearer(`Bearer ${secret}`, "")).toBe(false);
    expect(await isValidBearer("Bearer undefined", undefined)).toBe(false);
  });
});
