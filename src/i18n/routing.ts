import { defineRouting } from "next-intl/routing";

// Per aggiungere francese e spagnolo: aggiungi "fr" e "es" qui sotto
// e crea messages/fr.json e messages/es.json.
export const routing = defineRouting({
  locales: ["it", "en"],
  defaultLocale: "it",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
