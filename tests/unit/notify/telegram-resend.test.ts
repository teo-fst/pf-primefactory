// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { readNotifyConfig, DEV_EMAIL_FROM, type NotifyConfig } from "@/lib/notify/config";
import { applyDevRedirect, sendEmail } from "@/lib/notify/resend";
import { buildTelegramText, sendTelegram, type TelegramInput } from "@/lib/notify/telegram";

const config: NotifyConfig = {
  resendApiKey: "re_test_key",
  emailFrom: "Primefactory <noreply@primefactory.example>",
  devRedirectTo: undefined,
  telegramToken: "123456:TEST-TOKEN",
  telegramChatId: "-1001234567890",
  siteUrl: "https://primefactory.example",
};

describe("messaggio Telegram: nessun dato personale", () => {
  const input: TelegramInput = {
    eventType: "request_created",
    publicCode: "PF-26-0042",
    lineName: "Moto e bici",
    fileCount: null,
    adminUrl: "https://primefactory.example/it/admin",
  };

  it("nuova richiesta: solo codice, linea e link admin", () => {
    expect(buildTelegramText(input)).toBe(
      "Nuova richiesta PF-26-0042\nLinea: Moto e bici\nApri: https://primefactory.example/it/admin",
    );
  });

  it("file caricato: codice, numero di file, linea e link", () => {
    expect(buildTelegramText({ ...input, eventType: "file_uploaded", fileCount: 3 })).toBe(
      "File caricato sulla richiesta PF-26-0042 (3 file)\nLinea: Moto e bici\nApri: https://primefactory.example/it/admin",
    );
    expect(buildTelegramText({ ...input, eventType: "file_uploaded", fileCount: 1 })).not.toContain("file)");
  });

  it("anche se all'evento fossero allegati dati personali, nel testo non compaiono", () => {
    const polluted = {
      ...input,
      name: "Mario Rossi",
      email: "mario.rossi@example.com",
      phone: "+39 333 1234567",
      description: "Supporto targa per la mia R6",
      customer_id: "00000000-0000-0000-0000-000000000000",
      message: "testo riservato",
    } as TelegramInput;
    const text = buildTelegramText(polluted) ?? "";
    for (const secret of ["Mario", "Rossi", "mario.rossi", "example.com", "+39", "333", "Supporto", "R6", "riservato", "0000-0000"]) {
      expect(text).not.toContain(secret);
    }
    expect(text).toContain("PF-26-0042");
  });

  it("per gli altri eventi non si scrive nel gruppo", () => {
    for (const eventType of ["status_changed", "message_from_customer", "message_from_admin"] as const) {
      expect(buildTelegramText({ ...input, eventType })).toBeNull();
    }
  });

  it("senza linea nota il messaggio non ha la riga Linea", () => {
    expect(buildTelegramText({ ...input, lineName: null })).toBe(
      "Nuova richiesta PF-26-0042\nApri: https://primefactory.example/it/admin",
    );
  });

  it("sendTelegram usa il bot e il gruppo configurati e non mette dati nell'errore", async () => {
    const fetchFn = vi.fn(async () => new Response("{}", { status: 200 }));
    await sendTelegram(config, "ciao", fetchFn as unknown as typeof fetch);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.telegram.org/bot123456:TEST-TOKEN/sendMessage");
    expect(JSON.parse(String(init.body))).toEqual({ chat_id: "-1001234567890", text: "ciao", disable_web_page_preview: true });

    const failing = vi.fn(async () => new Response("{}", { status: 400 }));
    await expect(sendTelegram(config, "x", failing as unknown as typeof fetch)).rejects.toMatchObject({ code: "telegram_400" });

    const network = vi.fn(async () => {
      throw new Error("getaddrinfo ENOTFOUND api.telegram.org/bot123456:TEST-TOKEN");
    });
    const error = await sendTelegram(config, "x", network as unknown as typeof fetch).catch((e: Error) => e);
    expect(error).toMatchObject({ code: "telegram_rete" });
    expect(String((error as Error).message)).not.toContain("TEST-TOKEN");
  });
});

describe("email con Resend", () => {
  const message = { to: "cliente@example.com", subject: "Oggetto", html: "<p>x</p>", text: "x", idempotencyKey: "pf-notify-1-customer_email" };

  it("invia con chiave, mittente e Idempotency-Key", async () => {
    const fetchFn = vi.fn(async () => new Response("{}", { status: 200 }));
    await sendEmail(config, message, fetchFn as unknown as typeof fetch);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer re_test_key");
    expect(headers["Idempotency-Key"]).toBe("pf-notify-1-customer_email");
    expect(JSON.parse(String(init.body))).toMatchObject({
      from: "Primefactory <noreply@primefactory.example>",
      to: ["cliente@example.com"],
      subject: "Oggetto",
    });
  });

  it("con NOTIFY_DEV_REDIRECT_TO tutte le email vanno a quell'indirizzo, con l'originale nell'oggetto", async () => {
    const fetchFn = vi.fn(async () => new Response("{}", { status: 200 }));
    await sendEmail({ ...config, devRedirectTo: "sviluppo@example.org" }, message, fetchFn as unknown as typeof fetch);
    const body = JSON.parse(String((fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.to).toEqual(["sviluppo@example.org"]);
    expect(body.subject).toBe("[a: cliente@example.com] Oggetto");
  });

  it("applyDevRedirect senza indirizzo lascia il messaggio com'è", () => {
    expect(applyDevRedirect(message, undefined)).toBe(message);
    expect(applyDevRedirect(message, "")).toBe(message);
  });

  it("gli errori hanno solo un codice, senza chiave né destinatario", async () => {
    const bad = vi.fn(async () => new Response('{"message":"to cliente@example.com invalid"}', { status: 422 }));
    const error = await sendEmail(config, message, bad as unknown as typeof fetch).catch((e: Error) => e);
    expect(error).toMatchObject({ code: "resend_422" });
    expect(String((error as Error).message)).toBe("resend_422");

    const network = vi.fn(async () => {
      throw new Error("fetch failed: https://api.resend.com/emails re_test_key");
    });
    const netError = await sendEmail(config, message, network as unknown as typeof fetch).catch((e: Error) => e);
    expect(netError).toMatchObject({ code: "resend_rete" });
    expect(String((netError as Error).message)).not.toContain("re_test_key");
  });

  it("senza chiave o mittente non invia", async () => {
    const fetchFn = vi.fn();
    await expect(sendEmail({ ...config, resendApiKey: undefined }, message, fetchFn as unknown as typeof fetch)).rejects.toMatchObject({
      code: "email_non_configurata",
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("configurazione dalle variabili d'ambiente", () => {
  it("in sviluppo il mittente ha un default (onboarding@resend.dev)", () => {
    const c = readNotifyConfig({ RESEND_API_KEY: "re_x" }, "http://localhost:3000/");
    expect(c.emailFrom).toBe(DEV_EMAIL_FROM);
    expect(c.siteUrl).toBe("http://localhost:3000");
    expect(c.devRedirectTo).toBeUndefined();
  });
  it("in produzione senza EMAIL_FROM non c'è mittente (niente invii dal dominio di prova)", () => {
    const c = readNotifyConfig({ RESEND_API_KEY: "re_x", NODE_ENV: "production" }, "https://x.example");
    expect(c.emailFrom).toBeUndefined();
  });
  it("toglie virgolette e spazi, e il vuoto vale non impostata", () => {
    const c = readNotifyConfig(
      { RESEND_API_KEY: ' "re_x" ', EMAIL_FROM: "", TELEGRAM_BOT_TOKEN: "", TELEGRAM_CHAT_ID: "-100", NOTIFY_DEV_REDIRECT_TO: "  " },
      "https://x.example",
    );
    expect(c.resendApiKey).toBe("re_x");
    expect(c.telegramToken).toBeUndefined();
    expect(c.telegramChatId).toBe("-100");
    expect(c.devRedirectTo).toBeUndefined();
  });
});
