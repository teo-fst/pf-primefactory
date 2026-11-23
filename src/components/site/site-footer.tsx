import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getActivePages, getSiteTexts, pick, type PageRow } from "@/lib/content";
import { LEGAL_SLUGS } from "@/lib/content/legal-map";

export async function SiteFooter({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "Site" });
  const texts = await getSiteTexts(locale);

  let pages: PageRow[] = [];
  try {
    pages = await getActivePages();
  } catch (error) {
    console.warn("Footer: pagine non disponibili", error);
  }
  const legal = LEGAL_SLUGS.flatMap((slug) => {
    const page = pages.find((p) => p.slug === slug);
    return page ? [{ slug, label: pick(page, "title", locale) }] : [];
  });

  return (
    <footer className="border-t bg-secondary/60">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <p className="font-medium">{texts["footer.tagline"]}</p>
          <p className="text-sm text-muted-foreground">{texts["footer.prelaunch"]}</p>
        </div>
        {legal.length > 0 ? (
          <nav aria-label={t("legalNav")}>
            <ul className="flex flex-wrap gap-x-4 md:flex-col">
              {legal.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/legale/${item.slug}`}
                    className="inline-flex min-h-11 items-center text-sm underline-offset-4 hover:underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </footer>
  );
}
