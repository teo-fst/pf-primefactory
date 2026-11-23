import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export default function NotFound() {
  const t = useTranslations("Site");
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <p className="pf-label">404</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">{t("notFoundTitle")}</h1>
      <p className="mt-3 max-w-prose text-lg text-muted-foreground">{t("notFoundBody")}</p>
      <Link href="/" className={cn(buttonVariants({ size: "lg" }), "mt-6 min-h-11 px-6")}>
        {t("backHome")}
      </Link>
    </div>
  );
}
