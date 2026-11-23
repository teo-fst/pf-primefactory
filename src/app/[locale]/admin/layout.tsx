import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { NotificationBell } from "@/components/admin/notification-bell";
import { routing } from "@/i18n/routing";
import { getAdminMessages } from "@/lib/admin/messages";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Pannello admin",
  robots: { index: false, follow: false },
};

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

// Area riservata agli admin (Q12). Questo controllo porta alla pagina di accesso o al 403, ma non basta:
// i layout non vengono rieseguiti a ogni navigazione interna, quindi ogni pagina, Server Action e
// Route Handler ricontrolla il ruolo per conto suo, e la RLS del database è la barriera finale.
export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const { user } = await requireRole("admin", locale);
  const m = getAdminMessages(locale);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6" data-testid="admin-root">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-zinc-300 pb-2">
        <AdminNav
          label={m.nav.label}
          items={[
            { href: "/admin", label: m.nav.dashboard, exact: true },
            { href: "/admin/richieste", label: m.nav.requests },
            { href: "/admin/portfolio", label: m.nav.portfolio },
            { href: "/admin/eventi", label: m.nav.events },
            { href: "/admin/contenuti", label: m.nav.content },
            { href: "/admin/utenti", label: m.nav.users },
          ]}
        />
        <NotificationBell userId={user.id} label={m.nav.bell} />
      </div>
      {children}
    </div>
  );
}
