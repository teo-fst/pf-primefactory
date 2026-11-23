import "server-only";

// Ritentativi con attese crescenti. Il cron gira ogni 5 minuti, quindi le attese sotto i 5 minuti
// vengono comunque servite al passaggio successivo.
export const MAX_ATTEMPTS = 5;

// Attesa (in minuti) dopo il fallimento del tentativo n (n = 1..4). Dopo il 5° tentativo non si riprova.
const DELAYS_MINUTES = [2, 10, 30, 120] as const;

/**
 * Millisecondi da aspettare prima del prossimo tentativo, dato il numero del tentativo appena fallito
 * (1 = primo). `null` se i tentativi sono finiti: l'evento resta in coda con l'ultimo errore,
 * visibile a chi controlla la tabella.
 */
export function backoffDelayMs(failedAttempt: number): number | null {
  if (!Number.isInteger(failedAttempt) || failedAttempt < 1) return DELAYS_MINUTES[0] * 60_000;
  if (failedAttempt >= MAX_ATTEMPTS) return null;
  return DELAYS_MINUTES[failedAttempt - 1] * 60_000;
}

export function nextAttemptAt(now: Date, failedAttempt: number): Date | null {
  const delay = backoffDelayMs(failedAttempt);
  return delay === null ? null : new Date(now.getTime() + delay);
}
