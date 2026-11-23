import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { EventList } from "@/components/site/event-list";
import { routing } from "@/i18n/routing";
import { getActivePage, getSiteTexts, getUpcomingEvents, pick } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const page = await getActivePage("eventi");
  if (!page) return {};
  const texts = await getSiteTexts(locale);
  return pageMetadata({
    locale,
    path: "/eventi",
    title: pick(page, "title", locale),
    description: texts["events.intro"],
  });
}

export default async function EventsPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const page = await getActivePage("eventi");
  if (!page) notFound();
  const texts = await getSiteTexts(locale);
  const events = await getUpcomingEvents();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-semibold tracking-tight">{pick(page, "title", locale)}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{texts["events.intro"]}</p>
      <div className="mt-8">
        {events.length > 0 ? (
          <EventList events={events} locale={locale} />
        ) : (
          <p className="max-w-prose text-muted-foreground">{texts["events.empty"]}</p>
        )}
      </div>
    </div>
  );
}
