// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NotifyConfig } from "@/lib/notify/config";
import { processBatch } from "@/lib/notify/processor";
import { DeliveryError } from "@/lib/notify/resend";
import type { NotifyStore } from "@/lib/notify/store";
import type { EmailMessage, Labels, NotifyEventType, OutboxEvent, Recipient } from "@/lib/notify/types";

const NOW = new Date("2026-11-23T10:00:00Z");
const config: NotifyConfig = {
  resendApiKey: "re_test",
  emailFrom: "Primefactory <noreply@primefactory.example>",
  devRedirectTo: undefined,
  telegramToken: "tok",
  telegramChatId: "-100",
  siteUrl: "https://primefactory.example",
};

const customer: Recipient = { userId: "c-1", email: "cliente@example.com", name: "Mario", locale: "it" };
const customerEn: Recipient = { userId: "c-2", email: "client@example.com", name: "Mary", locale: "en" };
const adminA: Recipient = { userId: "a-1", email: "admin-a@example.com", name: "Socio A", locale: "it" };
const adminB: Recipient = { userId: "a-2", email: "admin-b@example.com", name: "Socio B", locale: "en" };

const lines: Record<string, Labels> = { "moto-bici": { it: "Moto e bici", en: "Motorcycles and bicycles" } };
const statuses: Record<string, Labels> = { in_produzione: { it: "In produzione", en: "In production" } };

type Calls = { done: [number, string[]][]; failed: [number, string, Date, string[]][] };

function makeStore(events: OutboxEvent[], users: Recipient[], admins: Recipient[]): { store: NotifyStore; calls: Calls; spies: Record<string, ReturnType<typeof vi.fn>> } {
  const calls: Calls = { done: [], failed: [] };
  const spies = {
    getRecipient: vi.fn(async (id: string) => users.find((u) => u.userId === id) ?? null),
    listAdmins: vi.fn(async () => admins),
    getLineLabels: vi.fn(async (slug: string) => lines[slug] ?? null),
  };
  const store: NotifyStore = {
    claimBatch: async () => events,
    markDone: async (id, delivered) => {
      calls.done.push([id, delivered]);
    },
    markFailed: async (id, code, next, delivered) => {
      calls.failed.push([id, code, next, delivered]);
    },
    getLineLabels: spies.getLineLabels,
    getStatusLabels: async (code) => statuses[code] ?? null,
    getRecipient: spies.getRecipient,
    listAdmins: spies.listAdmins,
  };
  return { store, calls, spies };
}

function event(eventType: NotifyEventType, payload: Record<string, unknown>, over: Partial<OutboxEvent> = {}): OutboxEvent {
  return { id: 1, eventType, requestId: "r-1", payload, attempts: 1, delivered: [], ...over };
}

describe("processore delle notifiche", () => {
  let emails: EmailMessage[];
  let telegrams: string[];
  const sendEmail = vi.fn(async (m: EmailMessage) => {
    emails.push(m);
  });
  const sendTelegram = vi.fn(async (t: string) => {
    telegrams.push(t);
  });

  beforeEach(() => {
    emails = [];
    telegrams = [];
    sendEmail.mockClear();
    sendTelegram.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  const run = (store: NotifyStore, over: Partial<NotifyConfig> = {}) =>
    processBatch({ store, config: { ...config, ...over }, sendEmail, sendTelegram, now: () => NOW });

  it("nuova richiesta: email al cliente (lingua del profilo), email a ogni admin e Telegram", async () => {
    const ev = event("request_created", { public_code: "PF-26-0042", line_slug: "moto-bici", customer_id: "c-2" });
    const { store, calls } = makeStore([ev], [customerEn], [adminA, adminB]);
    const summary = await run(store);

    expect(summary).toEqual({ claimed: 1, processed: 1, failed: 0, exhausted: 0 });
    expect(emails.map((m) => m.to)).toEqual(["client@example.com", "admin-a@example.com", "admin-b@example.com"]);
    // cliente: inglese, link all'area clienti; admin A: italiano; admin B: inglese; link admin
    expect(emails[0].subject).toBe("We received your request PF-26-0042");
    expect(emails[0].text).toContain("https://primefactory.example/en/area-clienti");
    expect(emails[1].subject).toBe("Nuova richiesta PF-26-0042 (Moto e bici)");
    expect(emails[1].text).toContain("https://primefactory.example/it/admin");
    expect(emails[2].subject).toBe("New request PF-26-0042 (Motorcycles and bicycles)");
    expect(telegrams).toEqual([
      "Nuova richiesta PF-26-0042\nLinea: Moto e bici\nApri: https://primefactory.example/it/admin",
    ]);
    expect(calls.done).toEqual([[1, ["customer_email", "admin_email:a-1", "admin_email:a-2", "telegram"]]]);
    expect(emails.map((m) => m.idempotencyKey)).toEqual([
      "pf-notify-1-customer_email",
      "pf-notify-1-admin_email:a-1",
      "pf-notify-1-admin_email:a-2",
    ]);
  });

  it("cambio stato: solo email al cliente, con l'etichetta dello stato nella sua lingua", async () => {
    const ev = event("status_changed", { public_code: "PF-26-0042", to_status: "in_produzione", customer_id: "c-1" });
    const { store } = makeStore([ev], [customer], [adminA]);
    await run(store);
    expect(emails).toHaveLength(1);
    expect(emails[0].to).toBe("cliente@example.com");
    expect(emails[0].subject).toBe("Richiesta PF-26-0042: In produzione");
    expect(telegrams).toHaveLength(0);
  });

  it("messaggio del cliente: solo email ai soci, nessun Telegram", async () => {
    const ev = event("message_from_customer", { public_code: "PF-26-0042", message_id: 7 });
    const { store } = makeStore([ev], [customer], [adminA, adminB]);
    await run(store);
    expect(emails.map((m) => m.to)).toEqual(["admin-a@example.com", "admin-b@example.com"]);
    expect(telegrams).toHaveLength(0);
  });

  it("messaggio dell'admin: solo email al cliente", async () => {
    const ev = event("message_from_admin", { public_code: "PF-26-0042", customer_id: "c-1", message_id: 8 });
    const { store } = makeStore([ev], [customer], [adminA]);
    await run(store);
    expect(emails.map((m) => m.to)).toEqual(["cliente@example.com"]);
  });

  it("file caricato: email ai soci e Telegram con il numero di file", async () => {
    const ev = event("file_uploaded", { public_code: "PF-26-0042", line_slug: "moto-bici", file_count: 3 });
    const { store } = makeStore([ev], [customer], [adminA]);
    await run(store);
    expect(emails.map((m) => m.to)).toEqual(["admin-a@example.com"]);
    expect(emails[0].subject).toBe("File caricati sulla richiesta PF-26-0042");
    expect(telegrams[0]).toContain("(3 file)");
  });

  it("Telegram non configurato: si salta senza errore e l'evento risulta consegnato", async () => {
    const ev = event("request_created", { public_code: "PF-26-0042", line_slug: "moto-bici", customer_id: "c-1" });
    const { store, calls } = makeStore([ev], [customer], [adminA]);
    const summary = await run(store, { telegramToken: undefined, telegramChatId: undefined });
    expect(summary.processed).toBe(1);
    expect(sendTelegram).not.toHaveBeenCalled();
    expect(calls.failed).toHaveLength(0);
  });

  it("se Telegram fallisce, le email già partite non si ripetono al tentativo successivo", async () => {
    const ev = event("request_created", { public_code: "PF-26-0042", line_slug: "moto-bici", customer_id: "c-1" });
    const first = makeStore([ev], [customer], [adminA]);
    sendTelegram.mockRejectedValueOnce(new DeliveryError("telegram_500"));
    const summary1 = await run(first.store);
    expect(summary1).toMatchObject({ processed: 0, failed: 1, exhausted: 0 });
    expect(emails).toHaveLength(2);
    expect(first.calls.failed).toHaveLength(1);
    const [id, code, next, delivered] = first.calls.failed[0];
    expect(id).toBe(1);
    expect(code).toBe("telegram_500");
    expect(next.toISOString()).toBe("2026-11-23T10:02:00.000Z"); // primo ritentativo dopo 2 minuti
    expect(delivered).toEqual(["customer_email", "admin_email:a-1"]);

    // Secondo tentativo: il database restituisce l'elenco delle consegne già riuscite
    emails = [];
    const retry = makeStore([{ ...ev, attempts: 2, delivered }], [customer], [adminA]);
    const summary2 = await run(retry.store);
    expect(summary2.processed).toBe(1);
    expect(emails).toHaveLength(0);
    expect(telegrams).toHaveLength(1);
  });

  it("se un admin non riceve l'email, gli altri la ricevono e il ritentativo riprova solo quello", async () => {
    const ev = event("message_from_customer", { public_code: "PF-26-0042" });
    const { store, calls } = makeStore([ev], [], [adminA, adminB]);
    sendEmail.mockRejectedValueOnce(new DeliveryError("resend_503"));
    await run(store);
    expect(emails.map((m) => m.to)).toEqual(["admin-b@example.com"]);
    expect(calls.failed[0][3]).toEqual(["admin_email:a-2"]);
  });

  it("dopo il quinto tentativo l'evento è esaurito e resta in coda con l'errore", async () => {
    const ev = event("status_changed", { public_code: "PF-26-0042", to_status: "in_produzione", customer_id: "c-1" }, { attempts: 5 });
    const { store, calls } = makeStore([ev], [customer], []);
    sendEmail.mockRejectedValueOnce(new Error("boom"));
    const summary = await run(store);
    expect(summary).toMatchObject({ processed: 0, failed: 1, exhausted: 1 });
    expect(calls.failed).toHaveLength(1);
    expect(calls.done).toHaveLength(0);
  });

  it("i tempi di attesa seguono il backoff per numero di tentativo", async () => {
    const waits: number[] = [];
    for (const attempts of [1, 2, 3, 4]) {
      const ev = event("status_changed", { public_code: "PF-26-0042", to_status: "in_produzione", customer_id: "c-1" }, { attempts });
      const { store, calls } = makeStore([ev], [customer], []);
      sendEmail.mockRejectedValueOnce(new Error("boom"));
      await run(store);
      waits.push((calls.failed[0][2].getTime() - NOW.getTime()) / 60_000);
    }
    expect(waits).toEqual([2, 10, 30, 120]);
  });

  it("cliente cancellato nel frattempo: nessun invio e nessun errore", async () => {
    const ev = event("status_changed", { public_code: "PF-26-0042", to_status: "in_produzione", customer_id: "sparito" });
    const { store, calls } = makeStore([ev], [], []);
    const summary = await run(store);
    expect(summary.processed).toBe(1);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(calls.done).toHaveLength(1);
  });

  it("nei log compaiono solo id dell'evento e codici d'errore, mai email o nomi", async () => {
    const ev = event("status_changed", { public_code: "PF-26-0042", to_status: "in_produzione", customer_id: "c-1" });
    const { store } = makeStore([ev], [customer], []);
    sendEmail.mockRejectedValueOnce(new Error("invalid to cliente@example.com Mario"));
    await run(store);
    const logged = [...vi.mocked(console.error).mock.calls, ...vi.mocked(console.warn).mock.calls].flat().join(" ");
    expect(logged).toContain("evento 1");
    expect(logged).not.toContain("cliente@example.com");
    expect(logged).not.toContain("Mario");
  });

  it("un lotto vuoto non fa nulla", async () => {
    const { store } = makeStore([], [], []);
    expect(await run(store)).toEqual({ claimed: 0, processed: 0, failed: 0, exhausted: 0 });
  });

  it("le letture ripetute nel lotto (admin, linea) si fanno una volta sola", async () => {
    const evs = [
      event("file_uploaded", { public_code: "PF-26-0001", line_slug: "moto-bici", file_count: 1 }, { id: 1 }),
      event("file_uploaded", { public_code: "PF-26-0002", line_slug: "moto-bici", file_count: 1 }, { id: 2 }),
    ];
    const { store, spies } = makeStore(evs, [], [adminA]);
    await run(store);
    expect(spies.listAdmins).toHaveBeenCalledTimes(1);
    expect(spies.getLineLabels).toHaveBeenCalledTimes(1);
  });
});
