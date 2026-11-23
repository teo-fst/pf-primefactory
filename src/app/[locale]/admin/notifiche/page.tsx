import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { PageTitle, Pill, formatDateTime } from "@/components/admin/ui";
import { Link } from "@/i18n/navigation";
import { initAdminPage } from "@/lib/admin/page";
import { createClient } from "@/lib/supabase/server";
import { markAllNotificationsRead, markNotificationRead } from "./actions";

type Props = { params: Promise<{ locale: string }> };

function payloadText(payload: unknown, key: string): string | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" && value !== "" ? value : null;
}

// Notifiche in-app dell'utente corrente (Q27). Le righe le crea il blocco notifiche (trigger del database).
export default async function NotificationsPage({ params }: Props) {
  const { locale, user, m } = await initAdminPage(params);
  const t = m.notifications;
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("notifications")
    .select("id, kind, request_id, payload, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const unread = (items ?? []).filter((n) => n.read_at === null).length;

  const kinds = t.kinds as Record<string, string>;

  return (
    <div>
      <PageTitle
        actions={
          unread > 0 ? (
            <ActionForm action={markAllNotificationsRead}>
              <SubmitButton variant="outline">{t.markAll}</SubmitButton>
            </ActionForm>
          ) : undefined
        }
      >
        {t.title}
      </PageTitle>

      {!items || items.length === 0 ? (
        <p className="text-zinc-700">{t.empty}</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-300 bg-white" data-testid="notifications-list">
          {items.map((n) => {
            const code = payloadText(n.payload, "public_code");
            const label = (kinds[n.kind] ?? n.kind).replace("{code}", code ?? "");
            return (
              <li
                key={n.id}
                data-unread={n.read_at === null}
                className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm ${n.read_at === null ? "bg-amber-50" : ""}`}
              >
                <div>
                  <p className="font-medium">
                    {n.request_id ? (
                      <Link href={`/admin/richieste/${n.request_id}`} className="underline underline-offset-2">
                        {label}
                      </Link>
                    ) : (
                      label
                    )}{" "}
                    {n.read_at === null ? <Pill tone="warn">{t.unread}</Pill> : null}
                  </p>
                  <p className="text-xs text-zinc-600">{formatDateTime(n.created_at, locale)}</p>
                </div>
                {n.read_at === null ? (
                  <ActionForm action={markNotificationRead}>
                    <input type="hidden" name="id" value={n.id} />
                    <SubmitButton variant="outline">{t.markRead}</SubmitButton>
                  </ActionForm>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
