import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PortfolioGrid } from "@/components/site/portfolio-grid";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  getActiveBusinessLines,
  getActivePage,
  getPublishedPortfolio,
  getSiteTexts,
  pick,
} from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ linea?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const page = await getActivePage("portfolio");
  if (!page) return {};
  const texts = await getSiteTexts(locale);
  return pageMetadata({
    locale,
    path: "/portfolio",
    title: pick(page, "title", locale),
    description: texts["portfolio.intro"],
  });
}

export default async function PortfolioPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const page = await getActivePage("portfolio");
  if (!page) notFound();

  const t = await getTranslations({ locale, namespace: "Site" });
  const texts = await getSiteTexts(locale);
  const [lines, items] = await Promise.all([
    getActiveBusinessLines(),
    getPublishedPortfolio(),
  ]);

  const query = (await searchParams).linea;
  const wanted = Array.isArray(query) ? query[0] : query;
  const selected = lines.find((line) => line.slug === wanted) ?? null;

  // Una foto compare se non ha linea o se la sua linea e attiva.
  const activeIds = new Set(lines.map((line) => line.id));
  const visible = items.filter(
    (item) =>
      (item.business_line_id === null || activeIds.has(item.business_line_id)) &&
      (!selected || item.business_line_id === selected.id),
  );
  const lineNames = new Map(lines.map((line) => [line.id, pick(line, "name", locale)]));

  const filterClass = (active: boolean) =>
    cn(
      "inline-flex min-h-11 items-center border px-3 text-sm font-medium hover:bg-accent",
      active ? "border-primary bg-primary text-primary-foreground hover:bg-primary" : "bg-card",
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-semibold tracking-tight">{pick(page, "title", locale)}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{texts["portfolio.intro"]}</p>

      <nav aria-label={t("filterByLine")} className="mt-6">
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link
              href="/portfolio"
              aria-current={selected ? undefined : "page"}
              className={filterClass(!selected)}
            >
              {t("allLines")}
            </Link>
          </li>
          {lines.map((line) => (
            <li key={line.slug}>
              <Link
                href={`/portfolio?linea=${line.slug}`}
                aria-current={selected?.slug === line.slug ? "page" : undefined}
                className={filterClass(selected?.slug === line.slug)}
              >
                {pick(line, "name", locale)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8">
        {visible.length > 0 ? (
          <PortfolioGrid items={visible} locale={locale} lineNames={lineNames} />
        ) : (
          <p className="max-w-prose text-muted-foreground">
            {selected ? t("noPhotos") : texts["portfolio.empty"]}
          </p>
        )}
      </div>
    </div>
  );
}
