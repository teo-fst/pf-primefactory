"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/** Selettore lingua: stessa pagina nell'altra lingua (il percorso resta uguale). */
export function LanguageSwitcher() {
  const t = useTranslations("Site");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t("language")}>
      <ul className="flex items-center gap-1">
        {routing.locales.map((code) => {
          const current = code === locale;
          return (
            <li key={code}>
              <Link
                href={pathname}
                locale={code}
                hrefLang={code}
                lang={code}
                aria-current={current ? "true" : undefined}
                aria-label={t(`languageNames.${code}`)}
                className={cn(
                  "inline-flex min-h-11 min-w-11 items-center justify-center font-mono text-sm uppercase tracking-wider",
                  current
                    ? "border-b-2 border-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {code}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
