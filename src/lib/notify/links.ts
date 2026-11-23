import "server-only";
import type { NotifyLocale } from "./types";

// Link nelle email e nei messaggi Telegram. Un solo punto da cambiare quando il pannello admin e
// l'area clienti avranno le pagine di dettaglio: oggi puntano alla radice dell'area, che esiste.
export function customerAreaUrl(siteUrl: string, locale: NotifyLocale): string {
  return `${siteUrl}/${locale}/area-clienti`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Link per i soci. Con l'id di una richiesta punta al suo dettaglio nel pannello
 * (`/<lingua>/admin/richieste/<id>`, percorso stabile dal blocco F1.9); senza id, o con un id che
 * non è un UUID, ricade sulla radice del pannello.
 */
export function adminAreaUrl(siteUrl: string, locale: NotifyLocale = "it", requestId?: string | null): string {
  if (requestId && UUID.test(requestId)) return `${siteUrl}/${locale}/admin/richieste/${requestId}`;
  return `${siteUrl}/${locale}/admin`;
}
