import "server-only";
import type { NotifyConfig } from "./config";
import { DeliveryError } from "./resend";
import type { NotifyEventType } from "./types";

// Telegram (Q31): messaggio nel gruppo soci per nuova richiesta e file caricato.
// Regola: SOLO codice pubblico, linea e link al pannello admin. Mai nome, email, telefono, descrizione.
// Il tipo qui sotto elenca di proposito soltanto i campi ammessi: anche se all'evento fossero
// allegati altri dati, questa funzione non li può leggere.
export type TelegramInput = {
  eventType: NotifyEventType;
  publicCode: string;
  lineName: string | null;
  fileCount: number | null;
  adminUrl: string;
};

/** Testo del messaggio, o `null` se per questo evento non si scrive nel gruppo. */
export function buildTelegramText(input: TelegramInput): string | null {
  const line = input.lineName ? `\nLinea: ${input.lineName}` : "";
  switch (input.eventType) {
    case "request_created":
      return `Nuova richiesta ${input.publicCode}${line}\nApri: ${input.adminUrl}`;
    case "file_uploaded": {
      const count = input.fileCount && input.fileCount > 1 ? ` (${input.fileCount} file)` : "";
      return `File caricato sulla richiesta ${input.publicCode}${count}${line}\nApri: ${input.adminUrl}`;
    }
    default:
      return null;
  }
}

/** Invia il messaggio al gruppo. Solleva DeliveryError("telegram_<stato>") in caso di errore. */
export async function sendTelegram(
  config: NotifyConfig,
  text: string,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  if (!config.telegramToken || !config.telegramChatId) throw new DeliveryError("telegram_non_configurato");

  let response: Response;
  try {
    // Il token sta nell'URL: non va mai riportato in log o messaggi d'errore.
    response = await fetchFn(`https://api.telegram.org/bot${config.telegramToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.telegramChatId,
        text,
        disable_web_page_preview: true,
      }),
    });
  } catch {
    throw new DeliveryError("telegram_rete");
  }
  if (!response.ok) throw new DeliveryError(`telegram_${response.status}`);
}
