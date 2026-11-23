// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import type { NotifyConfig } from "@/lib/notify/config";
import { processBatch } from "@/lib/notify/processor";
import { sendEmail } from "@/lib/notify/resend";
import { createNotifyStore, type NotifyStore } from "@/lib/notify/store";
import { sendTelegram } from "@/lib/notify/telegram";
import type { OutboxEvent } from "@/lib/notify/types";

// Integrazione con il database Supabase REALE (richiede SUPABASE_SECRET_KEY e NEXT_PUBLIC_SUPABASE_URL):
//   docker compose run --rm --no-deps -e E2E_WITH_SUPABASE=1 app npx vitest run tests/integration
// Crea utenti e dati di prova (indirizzi @example.invalid), verifica trigger, outbox e notifiche in-app,
// esegue il processore con invio Resend e Telegram SIMULATI (fetch finto) e alla fine cancella tutto.
// L'invio REALE di prova a Resend parte solo con NOTIFY_REAL_SEND_TEST=1 e NOTIFY_DEV_REDIRECT_TO impostata.
const enabled =
  process.env.E2E_WITH_SUPABASE === "1" &&
  Boolean(process.env.SUPABASE_SECRET_KEY) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

const CUSTOMER_EMAIL = "pf-test+notifiche@example.invalid";
const ADMIN_EMAIL = "pf-test+notifiche-admin@example.invalid";

const fakeConfig: NotifyConfig = {
  resendApiKey: "re_finta_di_prova",
  emailFrom: "Primefactory <onboarding@resend.dev>",
  devRedirectTo: undefined,
  telegramToken: "000000:FINTO-TOKEN",
  telegramChatId: "-100000000",
  siteUrl: "https://primefactory.test",
};

describe.skipIf(!enabled)("notifiche con il database reale", () => {
  const admin = enabled ? createAdminClient() : (null as unknown as ReturnType<typeof createAdminClient>);
  let customerId = "";
  let adminId = "";
  let requestId = "";
  let publicCode = "";

  async function findUser(email: string): Promise<string | null> {
    const { data, error } = await admin.rpc("get_user_id_by_email", { p_email: email });
    if (error) throw error;
    return data ?? null;
  }

  async function removeTestUsers() {
    for (const email of [CUSTOMER_EMAIL, ADMIN_EMAIL]) {
      const id = await findUser(email);
      // La cancellazione dell'utente elimina a cascata profilo, richieste, messaggi, file, notifiche e outbox.
      if (id) await admin.auth.admin.deleteUser(id);
    }
  }

  // Store che prende dall'outbox solo gli eventi della richiesta di prova (stessa forma di notify_claim_batch,
  // senza il lease): serve quando nel database ci sono eventi di altri test in corso, che non vanno toccati.
  function scopedStore(real: NotifyStore): NotifyStore {
    return {
      ...real,
      async claimBatch() {
        const { data, error } = await admin
          .from("notification_outbox")
          .select("*")
          .eq("request_id", requestId)
          .is("processed_at", null)
          .order("id");
        if (error) throw error;
        return (data ?? []).map(
          (row): OutboxEvent => ({
            id: row.id,
            eventType: row.event_type as OutboxEvent["eventType"],
            requestId: row.request_id,
            payload: row.payload as Record<string, unknown>,
            attempts: row.attempts + 1,
            delivered: row.delivered,
          }),
        );
      },
    };
  }

  function ok(result: { error: unknown }) {
    expect(result.error).toBeNull();
  }

  async function outbox(eventType?: string) {
    let query = admin.from("notification_outbox").select("*").eq("request_id", requestId).order("id");
    if (eventType) query = query.eq("event_type", eventType);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  beforeAll(async () => {
    await removeTestUsers(); // residui di un'esecuzione interrotta
    const customer = await admin.auth.admin.createUser({
      email: CUSTOMER_EMAIL,
      email_confirm: true,
      user_metadata: { full_name: "PF Test Notifiche", locale: "en" },
    });
    if (customer.error || !customer.data.user) throw new Error("creazione utente di prova non riuscita");
    customerId = customer.data.user.id;

    const adm = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      email_confirm: true,
      user_metadata: { full_name: "PF Test Admin", locale: "it" },
    });
    if (adm.error || !adm.data.user) throw new Error("creazione admin di prova non riuscita");
    adminId = adm.data.user.id;
    const promote = await admin.from("profiles").update({ role: "admin" }).eq("id", adminId);
    if (promote.error) throw promote.error;

    const line = await admin.from("business_lines").select("id").eq("slug", "moto-bici").single();
    if (line.error) throw line.error;
    const request = await admin
      .from("requests")
      .insert({
        customer_id: customerId,
        business_line_id: line.data.id,
        description: "Richiesta di prova per le notifiche",
        privacy_consent_at: new Date().toISOString(),
      })
      .select("id, public_code")
      .single();
    if (request.error) throw request.error;
    requestId = request.data.id;
    publicCode = request.data.public_code;
  }, 60_000);

  afterAll(async () => {
    if (!enabled) return;
    await removeTestUsers();
    // Nessun dato di prova residuo
    const left = await Promise.all([
      admin.from("requests").select("id", { count: "exact", head: true }).eq("id", requestId),
      admin.from("notification_outbox").select("id", { count: "exact", head: true }).eq("request_id", requestId),
      admin.from("notifications").select("id", { count: "exact", head: true }).in("user_id", [customerId, adminId]),
      admin.from("profiles").select("id", { count: "exact", head: true }).in("id", [customerId, adminId]),
    ]);
    expect(left.map((r) => r.count)).toEqual([0, 0, 0, 0]);
    expect(await findUser(CUSTOMER_EMAIL)).toBeNull();
    expect(await findUser(ADMIN_EMAIL)).toBeNull();
  }, 60_000);

  it("la nuova richiesta genera un evento con dati minimi e una notifica in-app per l'admin", async () => {
    const events = await outbox("request_created");
    expect(events).toHaveLength(1);
    expect(events[0].processed_at).toBeNull();
    expect(events[0].attempts).toBe(0);
    expect(Object.keys(events[0].payload as object).sort()).toEqual(["customer_id", "line_slug", "public_code"]);
    expect(events[0].payload).toMatchObject({ public_code: publicCode, line_slug: "moto-bici", customer_id: customerId });

    const inApp = await admin.from("notifications").select("kind, request_id, read_at").eq("user_id", adminId);
    expect(inApp.data).toEqual([{ kind: "request_created", request_id: requestId, read_at: null }]);
    const clientInApp = await admin.from("notifications").select("id").eq("user_id", customerId);
    expect(clientInApp.data).toHaveLength(0);
  });

  it("messaggi, stati e file generano gli eventi giusti (e le note interne nessuno)", async () => {
    // Messaggio del cliente -> avvisa i soci
    ok(await admin.from("request_messages").insert({ request_id: requestId, author_id: customerId, body: "Messaggio riservato del cliente" }));
    // Nota interna di un admin -> niente
    ok(await admin.from("request_messages").insert({ request_id: requestId, author_id: adminId, body: "Nota interna riservata", internal: true }));
    // Messaggio dell'admin non interno -> avvisa il cliente
    ok(await admin.from("request_messages").insert({ request_id: requestId, author_id: adminId, body: "Risposta riservata dell'admin" }));
    // Stato con notify_client -> evento; stato senza notify_client (controllo_qualita) -> nessun evento
    const s1 = await admin.from("requests").update({ status: "in_valutazione" }).eq("id", requestId);
    const s2 = await admin.from("requests").update({ status: "controllo_qualita" }).eq("id", requestId);
    expect(s1.error).toBeNull();
    expect(s2.error).toBeNull();
    // Due file del cliente di fila -> un solo evento con file_count 2; un file dell'admin -> niente
    const base = { request_id: requestId, size_bytes: 10 };
    ok(await admin.from("request_files").insert([
      { ...base, storage_path: `${requestId}/notifiche-1.stl`, original_name: "segreto-1.stl", uploaded_by: customerId },
      { ...base, storage_path: `${requestId}/notifiche-2.stl`, original_name: "segreto-2.stl", uploaded_by: customerId },
    ]));
    ok(await admin.from("request_files").insert({ ...base, storage_path: `${requestId}/notifiche-3.stl`, original_name: "segreto-3.stl", uploaded_by: adminId }));

    const byType = Object.fromEntries(
      ["request_created", "message_from_customer", "message_from_admin", "status_changed", "file_uploaded"].map((t) => [t, [] as unknown[]]),
    );
    for (const row of await outbox()) (byType[row.event_type] ??= []).push(row);
    expect(Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, v.length]))).toEqual({
      request_created: 1,
      message_from_customer: 1,
      message_from_admin: 1,
      status_changed: 1,
      file_uploaded: 1,
    });
    const status = (byType.status_changed[0] as { payload: Record<string, unknown> }).payload;
    expect(status).toMatchObject({ from_status: "richiesta", to_status: "in_valutazione", customer_id: customerId });
    const files = (byType.file_uploaded[0] as { payload: Record<string, unknown> }).payload;
    expect(files).toMatchObject({ file_count: 2, line_slug: "moto-bici" });

    // Dati minimi: nessun testo di messaggio, nome di file o email nel payload
    const dump = JSON.stringify(await outbox());
    for (const forbidden of ["riservat", "segreto-", ".stl", "@", "Richiesta di prova", "PF Test"]) {
      expect(dump).not.toContain(forbidden);
    }

    // In-app per l'admin: richiesta, messaggio del cliente, file (non il messaggio admin né lo stato)
    const inApp = await admin.from("notifications").select("kind").eq("user_id", adminId).order("id");
    expect((inApp.data ?? []).map((n) => n.kind)).toEqual(["request_created", "message_from_customer", "file_uploaded"]);
  }, 60_000);

  it("anon non legge né scrive l'outbox e non chiama le funzioni del processore (via API pubblica)", async () => {
    const anon = createPublicClient();
    expect(anon).not.toBeNull();
    if (!anon) return;
    const read = await anon.from("notification_outbox").select("id").limit(1);
    expect(read.error).not.toBeNull();
    expect(read.data ?? []).toHaveLength(0);
    const write = await anon.from("notification_outbox").insert({ event_type: "request_created", payload: {} });
    expect(write.error).not.toBeNull();
    const claim = await anon.rpc("notify_claim_batch", { p_limit: 1 });
    expect(claim.error).not.toBeNull();
    const done = await anon.rpc("notify_mark_done", { p_id: 1, p_delivered: [] });
    expect(done.error).not.toBeNull();
  });

  it("il processore consegna tutti gli eventi (Resend e Telegram simulati) e marca processed_at", async () => {
    const sent: { url: string; body: Record<string, unknown>; headers: Record<string, string> }[] = [];
    const fakeFetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      sent.push({
        url: String(url),
        body: JSON.parse(String(init?.body ?? "{}")),
        headers: (init?.headers ?? {}) as Record<string, string>,
      });
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;

    // Se nel database ci sono eventi di altri (altri test in corso) non si toccano: si prendono solo i nostri.
    // Senza eventi altrui si usa la funzione notify_claim_batch vera (via API con la chiave segreta).
    const real = createNotifyStore(admin);
    const foreign = await admin
      .from("notification_outbox")
      .select("id", { count: "exact", head: true })
      .is("processed_at", null)
      .neq("request_id", requestId);
    const store = (foreign.count ?? 0) === 0 ? real : scopedStore(real);

    const summary = await processBatch({
      store,
      config: fakeConfig,
      sendEmail: (m) => sendEmail(fakeConfig, m, fakeFetch),
      sendTelegram: (t) => sendTelegram(fakeConfig, t, fakeFetch),
      limit: 50,
    });
    expect(summary.failed).toBe(0);
    expect(summary.processed).toBeGreaterThanOrEqual(5);

    // Tutti gli eventi della richiesta di prova risultano consegnati
    const rows = await outbox();
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      expect(row.processed_at, `evento ${row.event_type}`).not.toBeNull();
      expect(row.last_error).toBeNull();
    }

    const emails = sent.filter((s) => s.url === "https://api.resend.com/emails");
    const telegrams = sent.filter((s) => s.url.startsWith("https://api.telegram.org/bot"));
    const to = (s: (typeof emails)[number]) => (s.body.to as string[])[0];
    const subjectFor = (addr: string) => emails.filter((e) => to(e) === addr).map((e) => String(e.body.subject));

    // Cliente (profilo in inglese): conferma, cambio stato, messaggio dell'admin. Niente per gli altri tre eventi.
    expect(subjectFor(CUSTOMER_EMAIL).sort()).toEqual(
      [
        `We received your request ${publicCode}`,
        `Request ${publicCode}: Under review`,
        `New message on request ${publicCode}`,
      ].sort(),
    );
    // Admin di prova (profilo in italiano): nuova richiesta, messaggio del cliente, file caricati
    expect(subjectFor(ADMIN_EMAIL).sort()).toEqual(
      [
        `Nuova richiesta ${publicCode} (Moto e bici)`,
        `Nuovo messaggio del cliente sulla richiesta ${publicCode}`,
        `File caricati sulla richiesta ${publicCode}`,
      ].sort(),
    );
    // Link ai due ambienti nei messaggi
    const customerMail = emails.find((e) => to(e) === CUSTOMER_EMAIL && String(e.body.subject).startsWith("We received"));
    expect(String(customerMail?.body.text)).toContain("https://primefactory.test/en/area-clienti");
    const adminMail = emails.find((e) => to(e) === ADMIN_EMAIL && String(e.body.subject).startsWith("Nuova richiesta"));
    expect(String(adminMail?.body.text)).toContain("https://primefactory.test/it/admin");

    // Telegram: solo nuova richiesta e file caricato, con codice, linea e link. Nessun dato personale.
    const texts = telegrams.map((t) => String(t.body.text));
    expect(texts).toHaveLength(2);
    expect(texts.sort()).toEqual(
      [
        `File caricato sulla richiesta ${publicCode} (2 file)\nLinea: Moto e bici\nApri: https://primefactory.test/it/admin`,
        `Nuova richiesta ${publicCode}\nLinea: Moto e bici\nApri: https://primefactory.test/it/admin`,
      ].sort(),
    );
    for (const t of telegrams) {
      expect(t.body.chat_id).toBe("-100000000");
      const body = JSON.stringify(t.body);
      for (const forbidden of ["PF Test", "example.invalid", "riservat", "segreto-", "Richiesta di prova"]) {
        expect(body).not.toContain(forbidden);
      }
    }

    // Idempotency-Key presente su ogni email
    for (const e of emails) expect(e.headers["Idempotency-Key"]).toMatch(/^pf-notify-\d+-/);
  }, 60_000);

  it("un secondo passaggio non rimanda nulla", async () => {
    const fakeFetch = vi.fn(async () => new Response("{}", { status: 200 })) as unknown as typeof fetch;
    const before = await outbox();
    const summary = await processBatch({
      store: scopedStore(createNotifyStore(admin)),
      config: fakeConfig,
      sendEmail: (m) => sendEmail(fakeConfig, m, fakeFetch),
      sendTelegram: (t) => sendTelegram(fakeConfig, t, fakeFetch),
    });
    expect(summary.processed).toBe(0);
    expect(fakeFetch).not.toHaveBeenCalled();
    expect((await outbox()).map((r) => r.processed_at)).toEqual(before.map((r) => r.processed_at));
  }, 60_000);

  it("invio REALE di prova a Resend (solo con NOTIFY_REAL_SEND_TEST=1 e NOTIFY_DEV_REDIRECT_TO impostata)", async (ctx) => {
    const redirect = (process.env.NOTIFY_DEV_REDIRECT_TO ?? "").replace(/^["']+|["']+$/g, "").trim();
    const key = (process.env.RESEND_API_KEY ?? "").replace(/^["']+|["']+$/g, "").trim();
    if (process.env.NOTIFY_REAL_SEND_TEST !== "1" || !redirect || !key) ctx.skip();
    const config: NotifyConfig = {
      ...fakeConfig,
      resendApiKey: key,
      emailFrom: (process.env.EMAIL_FROM ?? "").trim() || "Primefactory <onboarding@resend.dev>",
      devRedirectTo: redirect,
    };
    // Un solo messaggio, all'indirizzo di sviluppo; il destinatario originale (finto) è nell'oggetto
    await sendEmail(config, {
      to: CUSTOMER_EMAIL,
      subject: `Prova notifiche Primefactory ${publicCode}`,
      html: "<p>Prova di invio reale dalle notifiche (F1.10). Puoi ignorare questo messaggio.</p>",
      text: "Prova di invio reale dalle notifiche (F1.10). Puoi ignorare questo messaggio.",
      idempotencyKey: `pf-notify-prova-${requestId}`,
    });
  }, 60_000);
});
