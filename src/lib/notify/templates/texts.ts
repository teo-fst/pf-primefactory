import "server-only";
import type { NotifyEventType, NotifyLocale } from "../types";

// Testi delle email, IT/EN. Nessun contenuto scritto dal cliente (descrizione, messaggi, nomi dei file):
// le email dicono solo "c'è qualcosa di nuovo" e rimandano all'area riservata, dove l'accesso è protetto.

export type EmailAudience = "customer" | "admin";

export type TemplateVars = {
  code: string;
  /** Nome della linea nella lingua del destinatario; vuoto se non noto. */
  line: string;
  /** Etichetta dello stato nella lingua del destinatario (solo status_changed). */
  status: string;
  /** Numero di file (solo file_uploaded). */
  count: number;
  /** Nome del destinatario per il saluto; vuoto se non noto. */
  name: string;
};

type Copy = {
  subject: (v: TemplateVars) => string;
  heading: (v: TemplateVars) => string;
  paragraphs: (v: TemplateVars) => string[];
  cta: string;
};

export type TemplateKey =
  | "customer.request_created"
  | "customer.status_changed"
  | "customer.message_from_admin"
  | "admin.request_created"
  | "admin.message_from_customer"
  | "admin.file_uploaded";

const greet = {
  it: (v: TemplateVars) => (v.name ? `Ciao ${v.name},` : "Ciao,"),
  en: (v: TemplateVars) => (v.name ? `Hello ${v.name},` : "Hello,"),
};

const withLine = {
  it: (v: TemplateVars) => (v.line ? ` (${v.line})` : ""),
  en: (v: TemplateVars) => (v.line ? ` (${v.line})` : ""),
};

export const TEXTS: Record<NotifyLocale, Record<TemplateKey, Copy>> = {
  it: {
    "customer.request_created": {
      subject: (v) => `Abbiamo ricevuto la tua richiesta ${v.code}`,
      heading: (v) => `Richiesta ${v.code} ricevuta`,
      paragraphs: (v) => [
        `${greet.it(v)} abbiamo ricevuto la tua richiesta ${v.code}${withLine.it(v)}. La esaminiamo e ti rispondiamo appena possibile.`,
        "Puoi seguire lo stato e scriverci dall'area clienti. Per entrare usa questo indirizzo email: ti mandiamo un link di accesso, senza password.",
      ],
      cta: "Apri l'area clienti",
    },
    "customer.status_changed": {
      subject: (v) => `Richiesta ${v.code}: ${v.status}`,
      heading: (v) => `Aggiornamento sulla richiesta ${v.code}`,
      paragraphs: (v) => [
        `${greet.it(v)} lo stato della tua richiesta ${v.code} è cambiato: ora è «${v.status}».`,
        "Trovi il dettaglio nell'area clienti.",
      ],
      cta: "Apri l'area clienti",
    },
    "customer.message_from_admin": {
      subject: (v) => `Nuovo messaggio sulla richiesta ${v.code}`,
      heading: (v) => `Nuovo messaggio sulla richiesta ${v.code}`,
      paragraphs: (v) => [
        `${greet.it(v)} hai un nuovo messaggio da Primefactory sulla richiesta ${v.code}.`,
        "Leggilo e rispondi dall'area clienti.",
      ],
      cta: "Leggi il messaggio",
    },
    "admin.request_created": {
      subject: (v) => `Nuova richiesta ${v.code}${withLine.it(v)}`,
      heading: (v) => `Nuova richiesta ${v.code}`,
      paragraphs: (v) => [`È arrivata una nuova richiesta ${v.code}${withLine.it(v)}.`, "Aprila nel pannello admin."],
      cta: "Apri il pannello admin",
    },
    "admin.message_from_customer": {
      subject: (v) => `Nuovo messaggio del cliente sulla richiesta ${v.code}`,
      heading: (v) => `Messaggio del cliente su ${v.code}`,
      paragraphs: (v) => [`Il cliente ha scritto un nuovo messaggio sulla richiesta ${v.code}.`, "Leggilo e rispondi dal pannello admin."],
      cta: "Apri il pannello admin",
    },
    "admin.file_uploaded": {
      subject: (v) => `${v.count > 1 ? "File caricati" : "File caricato"} sulla richiesta ${v.code}`,
      heading: (v) => `${v.count > 1 ? `${v.count} file caricati` : "File caricato"} su ${v.code}`,
      paragraphs: (v) => [
        v.count > 1
          ? `Il cliente ha caricato ${v.count} file sulla richiesta ${v.code}${withLine.it(v)}.`
          : `Il cliente ha caricato un file sulla richiesta ${v.code}${withLine.it(v)}.`,
        "Li trovi nel dettaglio della richiesta, nel pannello admin.",
      ],
      cta: "Apri il pannello admin",
    },
  },
  en: {
    "customer.request_created": {
      subject: (v) => `We received your request ${v.code}`,
      heading: (v) => `Request ${v.code} received`,
      paragraphs: (v) => [
        `${greet.en(v)} we received your request ${v.code}${withLine.en(v)}. We will review it and get back to you as soon as possible.`,
        "You can follow its status and write to us from the client area. To sign in use this email address: we send you a sign-in link, no password needed.",
      ],
      cta: "Open the client area",
    },
    "customer.status_changed": {
      subject: (v) => `Request ${v.code}: ${v.status}`,
      heading: (v) => `Update on request ${v.code}`,
      paragraphs: (v) => [
        `${greet.en(v)} the status of your request ${v.code} has changed: it is now "${v.status}".`,
        "You can see the details in the client area.",
      ],
      cta: "Open the client area",
    },
    "customer.message_from_admin": {
      subject: (v) => `New message on request ${v.code}`,
      heading: (v) => `New message on request ${v.code}`,
      paragraphs: (v) => [
        `${greet.en(v)} you have a new message from Primefactory on request ${v.code}.`,
        "Read it and reply from the client area.",
      ],
      cta: "Read the message",
    },
    "admin.request_created": {
      subject: (v) => `New request ${v.code}${withLine.en(v)}`,
      heading: (v) => `New request ${v.code}`,
      paragraphs: (v) => [`A new request ${v.code}${withLine.en(v)} has arrived.`, "Open it in the admin panel."],
      cta: "Open the admin panel",
    },
    "admin.message_from_customer": {
      subject: (v) => `New customer message on request ${v.code}`,
      heading: (v) => `Customer message on ${v.code}`,
      paragraphs: (v) => [`The customer wrote a new message on request ${v.code}.`, "Read it and reply from the admin panel."],
      cta: "Open the admin panel",
    },
    "admin.file_uploaded": {
      subject: (v) => `${v.count > 1 ? "Files uploaded" : "File uploaded"} on request ${v.code}`,
      heading: (v) => `${v.count > 1 ? `${v.count} files uploaded` : "File uploaded"} on ${v.code}`,
      paragraphs: (v) => [
        v.count > 1
          ? `The customer uploaded ${v.count} files on request ${v.code}${withLine.en(v)}.`
          : `The customer uploaded a file on request ${v.code}${withLine.en(v)}.`,
        "You will find them in the request detail, in the admin panel.",
      ],
      cta: "Open the admin panel",
    },
  },
};

export const FOOTERS: Record<NotifyLocale, Record<EmailAudience, string>> = {
  it: {
    customer: "Ricevi questa email perché hai inviato una richiesta a Primefactory.",
    admin: "Avviso interno di Primefactory.",
  },
  en: {
    customer: "You receive this email because you sent a request to Primefactory.",
    admin: "Internal Primefactory notice.",
  },
};

export function templateKey(audience: EmailAudience, eventType: NotifyEventType): TemplateKey | null {
  const key = `${audience}.${eventType}`;
  return key in TEXTS.it ? (key as TemplateKey) : null;
}
