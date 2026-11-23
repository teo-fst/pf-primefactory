import "server-only";
import type { NotifyConfig } from "./config";
import type { EmailMessage } from "./types";

// Invio email con l'API REST di Resend (chiave "solo invio"). Niente SDK: basta fetch,
// che funziona identico in Node e su Cloudflare Workers.

export class DeliveryError extends Error {
  /** Codice breve e senza dati personali (es. "resend_422"): è l'unica cosa che finisce nei log. */
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = "DeliveryError";
    this.code = code;
  }
}

export function errorCode(error: unknown): string {
  if (error instanceof DeliveryError) return error.code;
  return "errore_interno";
}

/**
 * Sviluppo: se NOTIFY_DEV_REDIRECT_TO è impostata, il messaggio va a quell'indirizzo e il destinatario
 * originale compare nell'oggetto. Senza dominio verificato Resend consegna solo al proprietario
 * dell'account: così si prova tutto il flusso senza scrivere a nessun altro.
 */
export function applyDevRedirect(message: EmailMessage, redirectTo: string | undefined): EmailMessage {
  if (!redirectTo) return message;
  return { ...message, to: redirectTo, subject: `[a: ${message.to}] ${message.subject}` };
}

export async function sendEmail(
  config: NotifyConfig,
  message: EmailMessage,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  if (!config.resendApiKey || !config.emailFrom) throw new DeliveryError("email_non_configurata");
  const outgoing = applyDevRedirect(message, config.devRedirectTo);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.resendApiKey}`,
    "Content-Type": "application/json",
  };
  if (outgoing.idempotencyKey) headers["Idempotency-Key"] = outgoing.idempotencyKey;

  let response: Response;
  try {
    response = await fetchFn("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: config.emailFrom,
        to: [outgoing.to],
        subject: outgoing.subject,
        html: outgoing.html,
        text: outgoing.text,
      }),
    });
  } catch {
    // Errore di rete: il messaggio dell'eccezione potrebbe contenere l'URL, non lo riportiamo.
    throw new DeliveryError("resend_rete");
  }
  if (!response.ok) throw new DeliveryError(`resend_${response.status}`);
}
