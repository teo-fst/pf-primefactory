import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EventList } from "@/components/site/event-list";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  getActiveBusinessLines,
  getSiteTexts,
  getUpcomingEvents,
  isPageActive,
  pick,
  type BusinessLine,
  type EventRow,
} from "@/lib/content";
import { splitStep } from "@/lib/content/texts";
import { jsonLd, localizedUrl, pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Site" });
  const texts = await getSiteTexts(locale);
  return pageMetadata({
    locale,
    path: "/",
    title: t("metaHomeTitle"),
    description: texts["home.hero.subtitle"],
    absoluteTitle: true,
  });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  if (!(await isPageActive("home"))) notFound();

  const t = await getTranslations({ locale, namespace: "Site" });
  const texts = await getSiteTexts(locale);
  const [lines, events, interestActive, eventsActive] = await Promise.all([
    getActiveBusinessLines(),
    getUpcomingEvents().catch((error): EventRow[] => {
      console.warn("Home: eventi non disponibili", error);
      return [];
    }),
    isPageActive("lista-interesse"),
    isPageActive("eventi"),
  ]);

  const steps = [1, 2, 3, 4].map((n) => splitStep(texts[`home.method.step${n}`]));

  const organization = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Primefactory",
    alternateName: "pf",
    url: localizedUrl(locale, "/"),
    description: t("organizationDescription"),
    inLanguage: locale,
    areaServed: [
      { "@type": "AdministrativeArea", name: "Provincia di Imperia" },
      { "@type": "AdministrativeArea", name: "Liguria" },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(organization) }}
      />

      <section className="pf-grid-bg border-b" aria-labelledby="hero-titolo">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20">
          <p className="pf-label mb-4">pf / Primefactory</p>
          <h1
            id="hero-titolo"
            className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl"
          >
            {texts["home.hero.title"]}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            {texts["home.hero.subtitle"]}
          </p>
          {interestActive ? (
            <Link
              href="/lista-interesse"
              className={cn(buttonVariants({ size: "lg" }), "mt-8 min-h-11 px-6 text-base")}
            >
              {texts["home.hero.cta"]}
            </Link>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-14 px-4 py-12 sm:px-6">
        <div role="note" className="border-l-4 border-primary bg-accent p-4 text-accent-foreground">
          <p>{texts["home.prelaunch.notice"]}</p>
        </div>

        <section aria-labelledby="linee-titolo">
          <h2 id="linee-titolo" className="text-2xl font-semibold tracking-tight">
            {texts["home.lines.title"]}
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">{texts["home.lines.intro"]}</p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {lines.map((line) => (
              <LineCard key={line.slug} line={line} locale={locale} />
            ))}
          </ul>
        </section>

        <section aria-labelledby="metodo-titolo">
          <h2 id="metodo-titolo" className="text-2xl font-semibold tracking-tight">
            {texts["home.method.title"]}
          </h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li key={index} className="border-t-2 border-foreground pt-3">
                <span className="pf-label">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="eventi-titolo">
          <h2 id="eventi-titolo" className="text-2xl font-semibold tracking-tight">
            {texts["home.events.title"]}
          </h2>
          {events.length > 0 ? (
            <div className="mt-6">
              <EventList events={events.slice(0, 4)} locale={locale} />
            </div>
          ) : (
            <p className="mt-2 max-w-2xl text-muted-foreground">{texts["home.events.intro"]}</p>
          )}
          {eventsActive ? (
            <Link
              href="/eventi"
              className="mt-4 inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4"
            >
              {t("viewAllEvents")}
            </Link>
          ) : null}
        </section>

        {interestActive ? (
          <section className="border bg-card p-6 sm:p-8" aria-labelledby="cta-titolo">
            <h2 id="cta-titolo" className="text-2xl font-semibold tracking-tight">
              {texts["interest.title"]}
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">{texts["interest.intro"]}</p>
            <Link
              href="/lista-interesse"
              className={cn(buttonVariants({ size: "lg" }), "mt-5 min-h-11 px-6 text-base")}
            >
              {texts["home.hero.cta"]}
            </Link>
          </section>
        ) : null}
      </div>
    </>
  );
}

function LineCard({ line, locale }: { line: BusinessLine; locale: string }) {
  return (
    <li>
      <Card className="relative h-full rounded-none p-0 ring-1 ring-border">
        <div className="flex h-full flex-col gap-2 p-5">
          <h3 className="text-lg font-semibold">
            <Link
              href={`/linee/${line.slug}`}
              className="underline-offset-4 after:absolute after:inset-0 hover:underline"
            >
              {pick(line, "name", locale)}
            </Link>
          </h3>
          <p className="text-sm text-muted-foreground">{pick(line, "summary", locale)}</p>
        </div>
      </Card>
    </li>
  );
}
