import { Bell } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Campanella dell'header admin (Q27): conta le notifiche non lette dell'utente corrente.
 * La RLS mostra comunque solo le righe dell'utente; il filtro su user_id lo rende esplicito.
 */
export async function NotificationBell({ userId, label }: { userId: string; label: string }) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  const unread = count ?? 0;

  return (
    <Link
      href="/admin/notifiche"
      data-testid="notification-bell"
      data-unread={unread}
      aria-label={label.replace("{count}", String(unread))}
      className="relative inline-flex size-10 items-center justify-center rounded-lg hover:bg-zinc-100"
    >
      <Bell className="size-5" aria-hidden />
      {unread > 0 ? (
        <span
          aria-hidden
          className="absolute top-0.5 right-0.5 min-w-5 rounded-full bg-red-600 px-1 text-center text-xs leading-5 font-semibold text-white"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
