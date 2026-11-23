import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  // messages/<lingua>.json: testi dell'interfaccia di base.
  // messages/site.<lingua>.json: testi del sito pubblico (header, footer, pagine).
  const base = (await import(`../../messages/${locale}.json`)).default;
  const site = (await import(`../../messages/site.${locale}.json`)).default;

  return { locale, messages: { ...base, ...site } };
});
