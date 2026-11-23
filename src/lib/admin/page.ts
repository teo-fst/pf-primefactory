import "server-only";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { requireRole } from "@/lib/auth/session";
import { getAdminMessages } from "./messages";

/**
 * Avvio comune delle pagine del pannello: lingua valida e ruolo admin (ricontrollato in ogni pagina,
 * non solo nel layout). Senza sessione porta a /accedi, con un ruolo diverso risponde 403.
 */
export async function initAdminPage(params: Promise<{ locale: string }>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireRole("admin", locale);
  return { locale, user: session.user, profile: session.profile, m: getAdminMessages(locale) };
}
