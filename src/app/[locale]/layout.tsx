import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { routing } from "@/i18n/routing";
import { getSiteTexts } from "@/lib/content";
import { siteUrl } from "@/lib/seo";
import "../globals.css";

// Tema chiaro tecnico (Q32): un sans leggibile e un mono per i dettagli tecnici.
const plexSans = IBM_Plex_Sans({
  variable: "--font-pf-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-pf-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

// I contenuti vengono dal database (con cache Redis di 5 minuti): le pagine non sono statiche.
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Site" });
  const texts = await getSiteTexts(locale);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t("metaHomeTitle"), template: "%s | Primefactory" },
    description: texts["footer.tagline"],
    applicationName: "Primefactory",
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Params & { children: React.ReactNode }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Site" });

  return (
    <html
      lang={locale}
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <a
            href="#contenuto"
            className="sr-only z-50 bg-primary px-4 py-3 font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
          >
            {t("skipLink")}
          </a>
          <SiteHeader locale={locale} />
          <main id="contenuto" tabIndex={-1} className="flex-1 outline-none">
            {children}
          </main>
          <SiteFooter locale={locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
