import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { PageTitle, Pager, Pill, cardClass, formatDateTime, tableClass, tdClass, thClass } from "@/components/admin/ui";
import { Field, inputClass } from "@/components/interest/field";
import { listUserEmails } from "@/lib/admin/auth-admin";
import { initAdminPage } from "@/lib/admin/page";
import { createClient } from "@/lib/supabase/server";
import { changeUserRole, inviteUser } from "./actions";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const PER_PAGE = 25;
const ROLES = ["admin", "operatore", "cliente"] as const;
const TONES = { admin: "good", operatore: "warn", cliente: "neutral" } as const;

export default async function UsersPage({ params, searchParams }: Props) {
  const { locale, user, m } = await initAdminPage(params);
  const t = m.users;
  const raw = (await searchParams).pagina;
  const page = Math.max(1, Math.min(10_000, Number.parseInt(Array.isArray(raw) ? raw[0] : (raw ?? ""), 10) || 1));
  const from = (page - 1) * PER_PAGE;

  const supabase = await createClient();
  // Profili dal più recente. La RLS lascia vedere tutti i profili solo agli admin.
  const { data: profiles, count } = await supabase
    .from("profiles")
    .select("id, role, full_name, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PER_PAGE - 1);

  const emails = await listUserEmails((profiles ?? []).map((p) => p.id));

  return (
    <div>
      <PageTitle>{t.title}</PageTitle>

      <section className={`${cardClass} mb-10`} aria-labelledby="invite-title">
        <h2 id="invite-title" className="mb-1 text-lg font-semibold">
          {t.inviteTitle}
        </h2>
        <p className="mb-4 max-w-2xl text-sm text-zinc-700">{t.inviteHint}</p>
        <ActionForm action={inviteUser} className="flex flex-col gap-4" testId="invite-form">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="inv-email" label={t.email}>
              <input id="inv-email" name="email" type="email" required maxLength={254} autoComplete="off" className={inputClass} />
            </Field>
            <Field id="inv-name" label={t.fullName}>
              <input id="inv-name" name="full_name" maxLength={200} autoComplete="off" className={inputClass} />
            </Field>
            <Field id="inv-role" label={t.role}>
              <select id="inv-role" name="role" defaultValue="operatore" className={inputClass}>
                <option value="operatore">{t.roles.operatore}</option>
                <option value="admin">{t.roles.admin}</option>
              </select>
            </Field>
          </div>
          <div>
            <SubmitButton confirm={t.inviteConfirm}>{t.invite}</SubmitButton>
          </div>
        </ActionForm>
      </section>

      <section aria-labelledby="users-list">
        <h2 id="users-list" className="mb-3 text-lg font-semibold">
          {t.listTitle}
        </h2>
        <div className="overflow-x-auto">
          <table className={tableClass} data-testid="users-table">
            <thead className="border-b border-zinc-300">
              <tr>
                <th scope="col" className={thClass}>{t.fullName}</th>
                <th scope="col" className={thClass}>{t.email}</th>
                <th scope="col" className={thClass}>{t.role}</th>
                <th scope="col" className={thClass}>{t.since}</th>
                <th scope="col" className={thClass}>{t.changeRole}</th>
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).map((p) => (
                <tr key={p.id} className="border-b border-zinc-200" data-testid="user-row">
                  <td className={tdClass}>
                    {p.full_name || "—"} {p.id === user.id ? <Pill>{t.you}</Pill> : null}
                  </td>
                  <td className={`${tdClass} break-all`}>{emails.get(p.id) ?? "—"}</td>
                  <td className={tdClass}>
                    <Pill tone={TONES[p.role]}>{t.roles[p.role]}</Pill>
                  </td>
                  <td className={tdClass}>{formatDateTime(p.created_at, locale)}</td>
                  <td className={tdClass}>
                    <ActionForm action={changeUserRole} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="user_id" value={p.id} />
                      <select
                        key={p.role}
                        name="role"
                        defaultValue={p.role}
                        aria-label={`${t.role}: ${p.full_name || emails.get(p.id) || p.id}`}
                        className={`${inputClass} w-36`}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {t.roles[r]}
                          </option>
                        ))}
                      </select>
                      <SubmitButton variant="outline" confirm={t.roleConfirm}>
                        {t.apply}
                      </SubmitButton>
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager
          page={page}
          total={count ?? 0}
          pageSize={PER_PAGE}
          hrefFor={(p) => (p > 1 ? `/admin/utenti?pagina=${p}` : "/admin/utenti")}
          labels={{ prev: m.requests.prev, next: m.requests.next, summary: m.requests.pagerSummary }}
        />
      </section>
    </div>
  );
}
