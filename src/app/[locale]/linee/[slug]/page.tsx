import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PortfolioGrid } from "@/components/site/portfolio-grid";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  getBusinessLine,
  getPublishedPortfolio,
  getSiteTexts,
  isPageActive,
  pick,
} from "@/lib/content";
import { toParagraphs } from "@/lib/content/texts";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const line = await getBusinessLine(slug);
  if (!line) return {};
  return pageMetadata({
    locale,
    path: `/linee/${slug}`,
    title: pick(line, "name", locale),
    description: pick(line, "summary", locale),
  });
}

export default async function LinePage({ params }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Solo linee con visibilita "attiva": le altre rispondono 404.
  const line = await getBusinessLine(slug);
  if (!line || line.visibility !== "attiva") notFound();

  const t = await getTranslations({ locale, namespace: "Site" });
  const texts = await getSiteTexts(locale);
  const [portfolio, interestActive] = await Promise.all([
    getPublishedPortfolio().catch(() => []),
    isPageActive("lista-interesse"),
  ]);

  const body = toParagraphs(texts[`lines.${slug}.body`]);
  const photos = portfolio.filter((item) => item.business_line_id === line.id);
  const name = pick(line, "name", locale);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="pf-label">{String(line.sort / 10).padStart(2, "0")} / Primefactory</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">{name}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{pick(line, "summary", locale)}</p>

      <div className="mt-8 max-w-prose space-y-4 text-base leading-relaxed">
        {body.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-8">
        {line.accepts_requests ? (
          interestActive ? (
            <Link
              href={`/lista-interesse?linea=${slug}`}
              className={cn(buttonVariants({ size: "lg" }), "min-h-11 px-6 text-base")}
            >
              {texts["home.hero.cta"]}
            </Link>
          ) : null
        ) : (
          <p role="note" className="max-w-prose border-l-4 border-primary bg-accent p-4 text-accent-foreground">
            {t("infoOnly")}
          </p>
        )}
      </div>

      {photos.length > 0 ? (
        <section className="mt-12" aria-labelledby="foto-titolo">
          <h2 id="foto-titolo" className="mb-4 text-2xl font-semibold tracking-tight">
            {t("linePhotos")}
          </h2>
          <PortfolioGrid items={photos} locale={locale} lineNames={new Map([[line.id, name]])} />
        </section>
      ) : null}
    </div>
  );
}
