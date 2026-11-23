import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Markdown } from "@/components/site/markdown";
import { routing } from "@/i18n/routing";
import { getActivePage, getLegalDocumentBySlug, pick } from "@/lib/content";
import { isLegalSlug } from "@/lib/content/legal-map";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; doc: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, doc } = await params;
  if (!hasLocale(routing.locales, locale) || !isLegalSlug(doc)) return {};
  const page = await getActivePage(doc);
  if (!page) return {};
  return pageMetadata({
    locale,
    path: `/legale/${doc}`,
    title: pick(page, "title", locale),
  });
}

export default async function LegalPage({ params }: Props) {
  const { locale, doc } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  if (!isLegalSlug(doc)) notFound();
  const page = await getActivePage(doc);
  if (!page) notFound();
  const document = await getLegalDocumentBySlug(doc, locale);
  if (!document) notFound();

  const t = await getTranslations({ locale, namespace: "Site" });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="pf-label mb-4">
        {t("version")} {document.version}
      </p>
      <Markdown>{document.body_md}</Markdown>
    </div>
  );
}
