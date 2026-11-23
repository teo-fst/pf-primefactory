import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailEnabled, readNotifyConfig } from "./config";
import { processBatch, type ProcessSummary } from "./processor";
import { sendEmail } from "./resend";
import { createNotifyStore } from "./store";
import { sendTelegram } from "./telegram";

// Punto d'ingresso del processore: collega la logica di processor.ts a Supabase, Resend e Telegram reali.
// Lo usano la route POST /api/cron/notifiche (cron ogni 5 minuti) e kickNotifications (dopo l'invio del modulo).

export type NotifyRun = ProcessSummary & {
  /** false se manca RESEND_API_KEY (o EMAIL_FROM in produzione): nessun evento viene preso in carico. */
  enabled: boolean;
};

let warnedDisabled = false;

/**
 * Processa un lotto dell'outbox. Se l'email non è configurata non tocca la coda: gli eventi restano
 * in attesa e partiranno appena le variabili saranno impostate.
 */
export async function runNotifyBatch(options: { limit?: number } = {}): Promise<NotifyRun> {
  const config = readNotifyConfig();
  if (!emailEnabled(config)) {
    if (!warnedDisabled) {
      warnedDisabled = true;
      console.warn("[notify] RESEND_API_KEY o EMAIL_FROM mancanti: notifiche in attesa, nessun invio");
    }
    return { enabled: false, claimed: 0, processed: 0, failed: 0, exhausted: 0 };
  }

  const summary = await processBatch({
    store: createNotifyStore(createAdminClient()),
    config,
    sendEmail: (message) => sendEmail(config, message),
    sendTelegram: (text) => sendTelegram(config, text),
    limit: options.limit,
  });
  return { enabled: true, ...summary };
}

// Anti-raffica: una chiamata ogni pochi secondi per istanza basta (il cron raccoglie il resto).
// Impedisce che molti invii ravvicinati del modulo (o bot che compilano il campo trappola)
// si trasformino in altrettante interrogazioni al database.
const KICK_MIN_INTERVAL_MS = 5_000;
let lastKick = 0;

/**
 * Da chiamare subito dopo l'invio del modulo, dentro `after()`: tenta di consegnare in fretta la
 * nuova richiesta senza far aspettare il visitatore. Non solleva mai errori e non logga dati personali:
 * se non riesce, ci pensa il cron.
 */
export async function kickNotifications(): Promise<void> {
  const now = Date.now();
  if (now - lastKick < KICK_MIN_INTERVAL_MS) return;
  lastKick = now;
  try {
    await runNotifyBatch({ limit: 5 });
  } catch {
    console.error("[notify] invio immediato non riuscito, ci pensa il cron");
  }
}
