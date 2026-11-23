import "server-only";

// Tipi condivisi del sistema di notifiche (F1.10). Nessun dato personale nei tipi dell'evento:
// l'outbox contiene solo codice pubblico, linea e id tecnici (vedi la migrazione notifiche_outbox).

export const EVENT_TYPES = [
  "request_created",
  "status_changed",
  "message_from_customer",
  "message_from_admin",
  "file_uploaded",
] as const;

export type NotifyEventType = (typeof EVENT_TYPES)[number];

export function isEventType(value: unknown): value is NotifyEventType {
  return typeof value === "string" && (EVENT_TYPES as readonly string[]).includes(value);
}

/** Lingue dei template. Le altre lingue del profilo (fr, es) ricadono sull'italiano. */
export type NotifyLocale = "it" | "en";

export function pickLocale(raw: string | null | undefined): NotifyLocale {
  return raw === "en" ? "en" : "it";
}

/** Una riga della coda, già tradotta dal formato del database. */
export type OutboxEvent = {
  id: number;
  eventType: NotifyEventType;
  requestId: string | null;
  payload: Record<string, unknown>;
  /** Tentativo in corso (1 = primo). Già incrementato da notify_claim_batch. */
  attempts: number;
  /** Consegne già riuscite in un tentativo precedente. */
  delivered: string[];
};

/** Destinatario di un'email: i dati arrivano da Supabase al momento dell'invio e non si loggano. */
export type Recipient = {
  userId: string;
  email: string;
  name: string;
  locale: NotifyLocale;
};

/** Nome di una linea o di uno stato nelle due lingue. */
export type Labels = { it: string; en: string };

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Evita doppi invii se lo stesso tentativo viene ripetuto (header Idempotency-Key di Resend). */
  idempotencyKey?: string;
};
