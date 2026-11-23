import "server-only";
import { readEnv } from "@/lib/env";
import { siteUrl } from "@/lib/seo";

export type NotifyConfig = {
  /** Chiave Resend (solo invio). Senza, il processore non prende in carico nessun evento. */
  resendApiKey: string | undefined;
  /** Mittente. In produzione va impostato EMAIL_FROM (dominio verificato); in sviluppo c'è un default. */
  emailFrom: string | undefined;
  /** Solo sviluppo: se impostato, TUTTE le email vanno a questo indirizzo (l'originale resta nell'oggetto). */
  devRedirectTo: string | undefined;
  telegramToken: string | undefined;
  telegramChatId: string | undefined;
  /** Indirizzo pubblico del sito, senza barra finale (NEXT_PUBLIC_SITE_URL). */
  siteUrl: string;
};

// Mittente di prova di Resend: senza dominio verificato consegna solo al proprietario dell'account.
export const DEV_EMAIL_FROM = "Primefactory <onboarding@resend.dev>";

export function readNotifyConfig(
  env: Record<string, string | undefined> = process.env,
  site: string = siteUrl(),
): NotifyConfig {
  const production = env.NODE_ENV === "production";
  return {
    resendApiKey: readEnv("RESEND_API_KEY", env),
    emailFrom: readEnv("EMAIL_FROM", env) ?? (production ? undefined : DEV_EMAIL_FROM),
    devRedirectTo: readEnv("NOTIFY_DEV_REDIRECT_TO", env),
    telegramToken: readEnv("TELEGRAM_BOT_TOKEN", env),
    telegramChatId: readEnv("TELEGRAM_CHAT_ID", env),
    siteUrl: site.replace(/\/+$/, ""),
  };
}

export function emailEnabled(config: NotifyConfig): boolean {
  return Boolean(config.resendApiKey && config.emailFrom);
}

export function telegramEnabled(config: NotifyConfig): boolean {
  return Boolean(config.telegramToken && config.telegramChatId);
}
