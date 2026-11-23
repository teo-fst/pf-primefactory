import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  // Aree private o di servizio: non vanno indicizzate.
  const disallow = [
    "/api/",
    "/auth/",
    ...routing.locales.flatMap((locale) => [`/${locale}/accedi`, `/${locale}/area-clienti`]),
  ];
  return {
    rules: [{ userAgent: "*", allow: "/", disallow }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
