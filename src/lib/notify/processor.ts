import "server-only";
import { nextAttemptAt } from "./backoff";
import { telegramEnabled, type NotifyConfig } from "./config";
import { adminAreaUrl, customerAreaUrl } from "./links";
import { planDeliveries } from "./recipients";
import { errorCode } from "./resend";
import type { NotifyStore } from "./store";
import { buildTelegramText } from "./telegram";
import { renderEmail, type EmailAudience } from "./templates";
import type { EmailMessage, Labels, NotifyLocale, OutboxEvent, Recipient } from "./types";

// Cuore del sistema di notifiche: prende un lotto dall'outbox, consegna ogni evento a chi di dovere,
// registra l'esito. Non conosce Supabase, Resend o Telegram direttamente (arrivano in `deps`):
// così si prova con dati finti. Il collegamento reale sta in index.ts.
//
// Regole:
// - ogni consegna (email al cliente, email a ciascun socio, Telegram) è registrata a parte: se un
//   tentativo fallisce a metà, il successivo riprova solo ciò che manca (niente email doppie);
// - dopo MAX_ATTEMPTS tentativi l'evento resta in coda con l'ultimo errore;
// - nei log solo id dell'evento e codici d'errore, mai email, nomi o testi.

export const DEFAULT_BATCH_SIZE = 10;

export type ProcessDeps = {
  store: NotifyStore;
  config: NotifyConfig;
  sendEmail: (message: EmailMessage) => Promise<void>;
  sendTelegram: (text: string) => Promise<void>;
  now?: () => Date;
  limit?: number;
};

export type ProcessSummary = {
  claimed: number;
  /** Eventi consegnati del tutto. */
  processed: number;
  /** Eventi con almeno una consegna fallita (da ritentare o esauriti). */
  failed: number;
  /** Tra i falliti, quelli che hanno finito i tentativi. */
  exhausted: number;
};

function str(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

// Memorizza le letture ripetute dentro un lotto (stessa linea, stessi admin, stesso cliente):
// meno richieste a Supabase, importante nei limiti di richieste per invocazione di un Worker.
class Lookups {
  private readonly cache = new Map<string, Promise<unknown>>();
  constructor(private readonly store: NotifyStore) {}

  private memo<T>(key: string, load: () => Promise<T>): Promise<T> {
    let hit = this.cache.get(key) as Promise<T> | undefined;
    if (!hit) {
      hit = load();
      this.cache.set(key, hit);
    }
    return hit;
  }

  line(slug: string): Promise<Labels | null> {
    return this.memo(`line:${slug}`, () => this.store.getLineLabels(slug));
  }
  status(code: string): Promise<Labels | null> {
    return this.memo(`status:${code}`, () => this.store.getStatusLabels(code));
  }
  recipient(userId: string): Promise<Recipient | null> {
    return this.memo(`user:${userId}`, () => this.store.getRecipient(userId));
  }
  admins(): Promise<Recipient[]> {
    return this.memo("admins", () => this.store.listAdmins());
  }
}

async function buildEmail(
  event: OutboxEvent,
  audience: EmailAudience,
  recipient: Recipient,
  deps: ProcessDeps,
  lookups: Lookups,
): Promise<EmailMessage> {
  const locale: NotifyLocale = recipient.locale;
  const lineSlug = str(event.payload.line_slug);
  const toStatus = str(event.payload.to_status);
  const lineLabels = lineSlug ? await lookups.line(lineSlug) : null;
  const statusLabels = toStatus ? await lookups.status(toStatus) : null;

  const rendered = renderEmail({
    eventType: event.eventType,
    audience,
    locale,
    publicCode: str(event.payload.public_code) ?? "",
    lineName: lineLabels?.[locale] ?? null,
    statusLabel: statusLabels?.[locale] ?? toStatus,
    fileCount: num(event.payload.file_count),
    recipientName: audience === "customer" ? recipient.name : null,
    link:
      audience === "customer"
        ? customerAreaUrl(deps.config.siteUrl, locale)
        : adminAreaUrl(deps.config.siteUrl, locale, event.requestId),
  });
  return { to: recipient.email, ...rendered };
}

/** Consegna di un evento: restituisce le consegne riuscite e il primo errore (se c'è). */
async function deliver(
  event: OutboxEvent,
  deps: ProcessDeps,
  lookups: Lookups,
): Promise<{ delivered: Set<string>; failure: string | null }> {
  const delivered = new Set(event.delivered);
  let failure: string | null = null;
  const fail = (error: unknown) => {
    failure ??= errorCode(error);
  };

  const send = async (token: string, message: EmailMessage) => {
    await deps.sendEmail({ ...message, idempotencyKey: `pf-notify-${event.id}-${token}` });
    delivered.add(token);
  };

  for (const step of planDeliveries(event.eventType)) {
    try {
      if (step === "customer_email") {
        if (delivered.has("customer_email")) continue;
        const customerId = str(event.payload.customer_id);
        const recipient = customerId ? await lookups.recipient(customerId) : null;
        if (!recipient) {
          // Cliente cancellato nel frattempo (Q38): non c'è più nessuno da avvisare, non è un errore.
          console.warn(`[notify] evento ${event.id}: destinatario cliente non trovato, consegna saltata`);
          delivered.add("customer_email");
          continue;
        }
        await send("customer_email", await buildEmail(event, "customer", recipient, deps, lookups));
      } else if (step === "admin_email") {
        const admins = await lookups.admins();
        if (admins.length === 0) console.warn(`[notify] evento ${event.id}: nessun admin con email, avviso saltato`);
        // Un admin alla volta: se uno fallisce gli altri vengono comunque avvisati e il tentativo
        // successivo riprova solo quello che manca.
        for (const admin of admins) {
          const token = `admin_email:${admin.userId}`;
          if (delivered.has(token)) continue;
          try {
            await send(token, await buildEmail(event, "admin", admin, deps, lookups));
          } catch (error) {
            fail(error);
          }
        }
      } else {
        if (!telegramEnabled(deps.config)) continue; // bot non configurato: si salta senza errore (Q31)
        if (delivered.has("telegram")) continue;
        const lineSlug = str(event.payload.line_slug);
        const lineLabels = lineSlug ? await lookups.line(lineSlug) : null;
        const text = buildTelegramText({
          eventType: event.eventType,
          publicCode: str(event.payload.public_code) ?? "",
          lineName: lineLabels?.it ?? null,
          fileCount: num(event.payload.file_count),
          adminUrl: adminAreaUrl(deps.config.siteUrl, "it", event.requestId),
        });
        if (text === null) continue;
        await deps.sendTelegram(text);
        delivered.add("telegram");
      }
    } catch (error) {
      fail(error);
    }
  }
  return { delivered, failure };
}

export async function processBatch(deps: ProcessDeps): Promise<ProcessSummary> {
  const now = deps.now ?? (() => new Date());
  const events = await deps.store.claimBatch(deps.limit ?? DEFAULT_BATCH_SIZE);
  const summary: ProcessSummary = { claimed: events.length, processed: 0, failed: 0, exhausted: 0 };
  const lookups = new Lookups(deps.store);

  for (const event of events) {
    try {
      const { delivered, failure } = await deliver(event, deps, lookups);
      if (failure === null) {
        await deps.store.markDone(event.id, [...delivered]);
        summary.processed += 1;
        continue;
      }
      const next = nextAttemptAt(now(), event.attempts);
      await deps.store.markFailed(event.id, failure, next ?? now(), [...delivered]);
      summary.failed += 1;
      if (next === null) summary.exhausted += 1;
      console.error(
        `[notify] evento ${event.id}: tentativo ${event.attempts} non riuscito (${failure})${next === null ? ", tentativi esauriti" : ""}`,
      );
    } catch (error) {
      // Errore nel registrare l'esito (es. database irraggiungibile): la riga resta "affittata" e
      // tornerà disponibile alla scadenza del lease. Si continua con gli altri eventi.
      summary.failed += 1;
      console.error(`[notify] evento ${event.id}: esito non registrato (${errorCode(error)})`);
    }
  }
  return summary;
}
