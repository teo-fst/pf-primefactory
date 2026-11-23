import { Link } from "@/i18n/navigation";
import { PageTitle, Pill, cardClass, formatDateTime, tableClass, tdClass, thClass } from "@/components/admin/ui";
import { initAdminPage } from "@/lib/admin/page";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ locale: string }> };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Dashboard (F1.9): richieste per stato, ultime richieste, file ancora da copiare sul server interno (Q19).
export default async function AdminDashboard({ params }: Props) {
  const { locale, m } = await initAdminPage(params);
  const t = m.dashboard;
  const supabase = await createClient();

  const { data: statuses } = await supabase.from("request_statuses").select("code, label_it, sort").order("sort");
  const counts = await Promise.all(
    (statuses ?? []).map(async (s) => {
      const { count } = await supabase.from("requests").select("id", { count: "exact", head: true }).eq("status", s.code);
      return { ...s, count: count ?? 0 };
    }),
  );
  const labelOf = new Map((statuses ?? []).map((s) => [s.code, s.label_it]));

  const [{ data: latest }, { data: pending, count: pendingCount }] = await Promise.all([
    supabase
      .from("requests")
      .select("id, public_code, kind, status, created_at, business_lines(name_it), profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("request_files")
      .select("id, original_name, size_bytes, created_at, request_id, requests(public_code)", { count: "exact" })
      .is("synced_at", null)
      .order("created_at", { ascending: true })
      .limit(10),
  ]);

  return (
    <div>
      <PageTitle>{t.title}</PageTitle>

      <section aria-labelledby="by-status" className="mb-10">
        <h2 id="by-status" className="mb-3 text-lg font-semibold">
          {t.byStatus}
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-testid="status-counts">
          {counts.map((s) => (
            <li key={s.code}>
              <Link
                href={`/admin/richieste?stato=${s.code}`}
                className={`${cardClass} flex items-baseline justify-between hover:border-zinc-500`}
                data-testid={`count-${s.code}`}
              >
                <span className="text-sm">{s.label_it}</span>
                <span className="text-2xl font-semibold tabular-nums">{s.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="latest" className="mb-10">
        <h2 id="latest" className="mb-3 text-lg font-semibold">
          {t.latest}
        </h2>
        {!latest || latest.length === 0 ? (
          <p className="text-zinc-700">{t.noRequests}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead className="border-b border-zinc-300">
                <tr>
                  <th scope="col" className={thClass}>{m.requests.colCode}</th>
                  <th scope="col" className={thClass}>{m.requests.colCustomer}</th>
                  <th scope="col" className={thClass}>{m.requests.colLine}</th>
                  <th scope="col" className={thClass}>{m.requests.colStatus}</th>
                  <th scope="col" className={thClass}>{m.requests.colDate}</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-200">
                    <td className={`${tdClass} font-mono`}>
                      <Link href={`/admin/richieste/${r.id}`} className="underline underline-offset-2">
                        {r.public_code}
                      </Link>
                    </td>
                    <td className={tdClass}>{r.profiles?.full_name || "—"}</td>
                    <td className={tdClass}>{r.business_lines?.name_it ?? "—"}</td>
                    <td className={tdClass}>{labelOf.get(r.status) ?? r.status}</td>
                    <td className={tdClass}>{formatDateTime(r.created_at, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="pending-files">
        <h2 id="pending-files" className="mb-1 text-lg font-semibold">
          {t.pendingFiles} <Pill tone={pendingCount ? "warn" : "good"}>{pendingCount ?? 0}</Pill>
        </h2>
        <p className="mb-3 text-sm text-zinc-600">{t.pendingFilesHint}</p>
        {!pending || pending.length === 0 ? (
          <p className="text-zinc-700">{t.noPendingFiles}</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-300 bg-white" data-testid="pending-files">
            {pending.map((f) => (
              <li key={f.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2 text-sm">
                <span>
                  <Link href={`/admin/richieste/${f.request_id}`} className="font-mono underline underline-offset-2">
                    {f.requests?.public_code ?? f.request_id}
                  </Link>{" "}
                  {f.original_name}
                </span>
                <span className="text-zinc-600">
                  {formatBytes(f.size_bytes)} · {formatDateTime(f.created_at, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
