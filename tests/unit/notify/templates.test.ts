// @vitest-environment node
import { describe, expect, it } from "vitest";
import { EVENT_TYPES } from "@/lib/notify/types";
import { renderEmail } from "@/lib/notify/templates";
import { escapeHtml } from "@/lib/notify/templates/html";

const base = {
  publicCode: "PF-26-0042",
  lineName: "Moto e bici",
  link: "https://primefactory.example/it/area-clienti",
};

describe("template email", () => {
  it("richiesta ricevuta al cliente, in italiano", () => {
    const mail = renderEmail({ ...base, eventType: "request_created", audience: "customer", locale: "it", recipientName: "Mario" });
    expect(mail.subject).toBe("Abbiamo ricevuto la tua richiesta PF-26-0042");
    expect(mail.html).toContain('lang="it"');
    expect(mail.html).toContain("Ciao Mario, abbiamo ricevuto la tua richiesta PF-26-0042 (Moto e bici)");
    expect(mail.html).toContain('href="https://primefactory.example/it/area-clienti"');
    expect(mail.text).toContain("Apri l'area clienti: https://primefactory.example/it/area-clienti");
  });

  it("richiesta ricevuta al cliente, in inglese", () => {
    const mail = renderEmail({
      ...base,
      lineName: "Motorcycles and bicycles",
      link: "https://primefactory.example/en/area-clienti",
      eventType: "request_created",
      audience: "customer",
      locale: "en",
      recipientName: "Mary",
    });
    expect(mail.subject).toBe("We received your request PF-26-0042");
    expect(mail.html).toContain('lang="en"');
    expect(mail.html).toContain("Hello Mary, we received your request PF-26-0042 (Motorcycles and bicycles)");
    expect(mail.text).toContain("Open the client area: https://primefactory.example/en/area-clienti");
  });

  it("cambio stato: l'etichetta dello stato compare in oggetto e corpo, in entrambe le lingue", () => {
    const it = renderEmail({ ...base, eventType: "status_changed", audience: "customer", locale: "it", statusLabel: "In produzione" });
    expect(it.subject).toBe("Richiesta PF-26-0042: In produzione");
    expect(it.text).toContain("ora è «In produzione»");
    const en = renderEmail({ ...base, eventType: "status_changed", audience: "customer", locale: "en", statusLabel: "In production" });
    expect(en.subject).toBe("Request PF-26-0042: In production");
    expect(en.text).toContain('it is now "In production"');
  });

  it("messaggio dell'admin al cliente: avvisa ma non riporta il testo", () => {
    for (const locale of ["it", "en"] as const) {
      const mail = renderEmail({ ...base, eventType: "message_from_admin", audience: "customer", locale });
      expect(mail.subject).toContain("PF-26-0042");
      expect(mail.html.length).toBeGreaterThan(200);
    }
  });

  it("avvisi ai soci: nuova richiesta, messaggio del cliente, file (singolare e plurale)", () => {
    const created = renderEmail({ ...base, link: "https://x.example/it/admin", eventType: "request_created", audience: "admin", locale: "it" });
    expect(created.subject).toBe("Nuova richiesta PF-26-0042 (Moto e bici)");
    expect(created.text).toContain("Apri il pannello admin: https://x.example/it/admin");

    const msg = renderEmail({ ...base, eventType: "message_from_customer", audience: "admin", locale: "en" });
    expect(msg.subject).toBe("New customer message on request PF-26-0042");

    const one = renderEmail({ ...base, eventType: "file_uploaded", audience: "admin", locale: "it", fileCount: 1 });
    expect(one.subject).toBe("File caricato sulla richiesta PF-26-0042");
    const many = renderEmail({ ...base, eventType: "file_uploaded", audience: "admin", locale: "en", fileCount: 3 });
    expect(many.subject).toBe("Files uploaded on request PF-26-0042");
    expect(many.text).toContain("3 files");
  });

  it("l'HTML esce sempre con i valori dei dati protetti da escape", () => {
    const mail = renderEmail({
      ...base,
      eventType: "request_created",
      audience: "customer",
      locale: "it",
      recipientName: '<script>alert("x")</script>',
      lineName: "A & B",
    });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(mail.html).toContain("A &amp; B");
  });

  it("escapeHtml copre i cinque caratteri speciali", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });

  it("ogni combinazione destinatario/evento prevista ha un template; le altre sollevano un errore", () => {
    const valid = [
      ["customer", "request_created"],
      ["customer", "status_changed"],
      ["customer", "message_from_admin"],
      ["admin", "request_created"],
      ["admin", "message_from_customer"],
      ["admin", "file_uploaded"],
    ] as const;
    for (const [audience, eventType] of valid) {
      for (const locale of ["it", "en"] as const) {
        const mail = renderEmail({ ...base, eventType, audience, locale, statusLabel: "X" });
        expect(mail.subject.length).toBeGreaterThan(5);
        expect(mail.html).toContain("<!doctype html>");
        expect(mail.text.length).toBeGreaterThan(20);
      }
    }
    // Ad esempio il cliente non riceve avvisi di "file caricato" e gli admin non ricevono "stato cambiato".
    expect(() => renderEmail({ ...base, eventType: "file_uploaded", audience: "customer", locale: "it" })).toThrow();
    expect(() => renderEmail({ ...base, eventType: "status_changed", audience: "admin", locale: "it" })).toThrow();
    expect(EVENT_TYPES).toHaveLength(5);
  });
});
