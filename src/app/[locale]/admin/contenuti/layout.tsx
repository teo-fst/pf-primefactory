import { AdminNav } from "@/components/admin/admin-nav";
import { getAdminMessages } from "@/lib/admin/messages";

// Sotto-navigazione dei contenuti. Il controllo del ruolo resta nel layout `admin` e in ogni pagina.
export default function ContentLayout({ children }: { children: React.ReactNode }) {
  const m = getAdminMessages();
  return (
    <div>
      <AdminNav
        label={m.content.navLabel}
        className="mb-6"
        items={[
          { href: "/admin/contenuti/testi", label: m.content.tabTexts },
          { href: "/admin/contenuti/visibilita", label: m.content.tabVisibility },
          { href: "/admin/contenuti/moduli", label: m.content.tabForms },
        ]}
      />
      {children}
    </div>
  );
}
