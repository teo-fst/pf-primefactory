import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/interest/field";
import { PageTitle, Pager, Pill, formatDateTime, tableClass, tdClass, thClass } from "@/components/admin/ui";
import { initAdminPage } from "@/lib/admin/page";
import { PAGE_SIZE, REQUEST_KINDS, parseRequestFilters, requestsHref } from "@/lib/admin/request-filters";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Elenco richieste (Q13) con filtri per stato, linea, tipo, fonte e testo (codice o descrizione).
// I filtri sono parametri dell'indirizzo (un modulo GET): niente JavaScript necessario.
export default async function RequestsPage({ params, searchParams }: Props) {
  const { locale, m } = await initAdminPage(params);
  const t = m.requests;
  const filters = parseRequestFilters(await searchParams);
  const supabase = await createClient();

  const [{ data: statuses }, { data: lines }] = await Promise.all([
    supabase.from("request_statuses").select("code, label_it").order("sort"),
    supabase.from("business_lines").select("id, slug, name_it").order("sort"),
  ]);
  const labelOf = new Map((statuses ?? []).map((s) => [s.code, s.label_it]));
  const lineId = filters.line ? (lines ?? []).find((l) => l.slug === filters.line)?.id : undefined;

  const from = (filters.page - 1) * PAGE_SIZE;
  let query = supabase
    .from("requests")
    .select("id, public_code, kind, status, source, description, created_at, business_lines(name_it), profiles(full_name)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.line) query = query.eq("business_line_id", lineId ?? -1);
  if (filters.kind) query = query.eq("kind", filters.kind);
  if (filters.source) query = query.ilike("source", `%${filters.source}%`);
  if (filters.q) query = query.or(`public_code.ilike.%${filters.q}%,description.ilike.%${filters.q}%`);
  const { data: requests, count, error } = await query;

  const hasFilters = Boolean(filters.status || filters.line || filters.kind || filters.source || filters.q);

  return (
    <div>
      <PageTitle>{t.title}</PageTitle>

      <form method="get" className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6" data-testid="request-filters">
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t.filterStatus}
          <select name="stato" defaultValue={filters.status ?? ""} className={inputClass}>
            <option value="">{t.all}</option>
            {(statuses ?? []).map((s) => (
              <option key={s.code} value={s.code}>
                {s.label_it}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t.filterLine}
          <select name="linea" defaultValue={filters.line ?? ""} className={inputClass}>
            <option value="">{t.all}</option>
            {(lines ?? []).map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.name_it}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t.filterKind}
          <select name="tipo" defaultValue={filters.kind ?? ""} className={inputClass}>
            <option value="">{t.all}</option>
            {REQUEST_KINDS.map((k) => (
              <option key={k} value={k}>
                {k === "preventivo" ? t.kindQuote : t.kindInterest}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t.filterSource}
          <input name="fonte" defaultValue={filters.source ?? ""} maxLength={80} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium lg:col-span-2">
          {t.filterText}
          <input name="q" defaultValue={filters.q ?? ""} maxLength={100} className={inputClass} placeholder={t.filterTextHint} />
        </label>
        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-6">
          <Button type="submit" className="min-h-9">
            {t.apply}
          </Button>
          {hasFilters ? (
            <Link href="/admin/richieste" className="text-sm underline underline-offset-2">
              {t.reset}
            </Link>
          ) : null}
        </div>
      </form>

      {error ? (
        <p role="alert" className="text-red-700">
          {t.loadError}
        </p>
      ) : !requests || requests.length === 0 ? (
        <p className="text-zinc-700">{hasFilters ? t.noResults : t.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className={tableClass} data-testid="requests-table">
            <thead className="border-b border-zinc-300">
              <tr>
                <th scope="col" className={thClass}>{t.colCode}</th>
                <th scope="col" className={thClass}>{t.colCustomer}</th>
                <th scope="col" className={thClass}>{t.colLine}</th>
                <th scope="col" className={thClass}>{t.colType}</th>
                <th scope="col" className={thClass}>{t.colStatus}</th>
                <th scope="col" className={thClass}>{t.colSource}</th>
                <th scope="col" className={thClass}>{t.colDate}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-zinc-200">
                  <td className={`${tdClass} font-mono`}>
                    <Link href={`/admin/richieste/${r.id}`} className="underline underline-offset-2">
                      {r.public_code}
                    </Link>
                    <p className="mt-0.5 max-w-xs truncate font-sans text-xs text-zinc-500">{r.description}</p>
                  </td>
                  <td className={tdClass}>{r.profiles?.full_name || "—"}</td>
                  <td className={tdClass}>{r.business_lines?.name_it ?? "—"}</td>
                  <td className={tdClass}>{r.kind === "preventivo" ? t.kindQuote : t.kindInterest}</td>
                  <td className={tdClass}>
                    <Pill>{labelOf.get(r.status) ?? r.status}</Pill>
                  </td>
                  <td className={`${tdClass} font-mono text-xs`}>{r.source ?? "—"}</td>
                  <td className={tdClass}>{formatDateTime(r.created_at, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager
            page={filters.page}
            total={count ?? 0}
            pageSize={PAGE_SIZE}
            hrefFor={(page) => requestsHref(filters, page)}
            labels={{ prev: t.prev, next: t.next, summary: t.pagerSummary }}
          />
        </div>
      )}
    </div>
  );
}
