import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  getActiveBusinessLines,
  getActivePages,
  getSiteTexts,
  pick,
  type BusinessLine,
  type PageRow,
} from "@/lib/content";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "./language-switcher";
import { NavLink } from "./nav-link";

// Pagine che compaiono nel menu (le altre sono legali o hanno un posto dedicato).
const NAV_PAGES = ["portfolio", "chi-siamo", "eventi"] as const;

export async function SiteHeader({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "Site" });
  const texts = await getSiteTexts(locale);

  // Se il database non risponde il sito resta navigabile: menu ridotto invece di errore.
  let lines: BusinessLine[] = [];
  let pages: PageRow[] = [];
  try {
    [lines, pages] = await Promise.all([getActiveBusinessLines(), getActivePages()]);
  } catch (error) {
    console.warn("Menu: dati non disponibili", error);
  }

  const pageBySlug = new Map(pages.map((p) => [p.slug, p]));
  const navPages = NAV_PAGES.flatMap((slug) => {
    const page = pageBySlug.get(slug);
    return page ? [{ href: `/${slug}`, label: pick(page, "title", locale) }] : [];
  });
  const navLines = lines.map((line) => ({
    href: `/linee/${line.slug}`,
    label: pick(line, "name", locale),
  }));
  const showInterest = pageBySlug.has("lista-interesse");

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 sm:px-6">
        <Link
          href="/"
          aria-label={t("homeLabel")}
          className="flex min-h-11 items-baseline gap-2"
        >
          <span className="font-mono text-2xl font-semibold tracking-tight text-primary">
            pf
          </span>
          <span className="text-lg font-semibold tracking-tight">Primefactory</span>
        </Link>

        <div role="group" aria-label={t("utilityNav")} className="flex items-center gap-3">
          <Link
            href="/accedi"
            className="inline-flex min-h-11 items-center px-1 text-sm font-medium underline-offset-4 hover:underline"
          >
            {t("clientArea")}
          </Link>
          {showInterest ? (
            <Link
              href="/lista-interesse"
              className={cn(buttonVariants({ variant: "default", size: "lg" }), "min-h-11 px-4")}
            >
              {texts["interest.title"]}
            </Link>
          ) : null}
          <LanguageSwitcher />
        </div>
      </div>

      <nav aria-label={t("mainNav")} className="border-t bg-secondary/60">
        <ul className="mx-auto flex max-w-6xl flex-wrap gap-x-5 px-4 sm:px-6">
          {[...navLines, ...navPages].map((item) => (
            <li key={item.href}>
              <NavLink href={item.href}>{item.label}</NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
