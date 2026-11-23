import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getActivePage, getSiteTexts, pick } from "@/lib/content";
import { toParagraphs } from "@/lib/content/texts";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const texts = await getSiteTexts(locale);
  return pageMetadata({
    locale,
    path: "/chi-siamo",
    title: texts["about.title"],
    description: toParagraphs(texts["about.body"])[0],
  });
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const page = await getActivePage("chi-siamo");
  if (!page) notFound();
  const texts = await getSiteTexts(locale);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-semibold tracking-tight">
        {texts["about.title"] || pick(page, "title", locale)}
      </h1>
      <div className="mt-6 max-w-prose space-y-4 text-base leading-relaxed">
        {toParagraphs(texts["about.body"]).map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
