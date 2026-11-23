import "server-only";
import type { NotifyLocale } from "./types";

// Link nelle email e nei messaggi Telegram. Un solo punto da cambiare quando il pannello admin e
// l'area clienti avranno le pagine di dettaglio: oggi puntano alla radice dell'area, che esiste.
export function customerAreaUrl(siteUrl: string, locale: NotifyLocale): string {
  return `${siteUrl}/${locale}/area-clienti`;
}

export function adminAreaUrl(siteUrl: string, locale: NotifyLocale = "it"): string {
  return `${siteUrl}/${locale}/admin`;
}
