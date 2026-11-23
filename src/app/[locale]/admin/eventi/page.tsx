import { EventForm } from "@/components/admin/event-form";
import { PageTitle, Pill, cardClass, tableClass, tdClass, thClass } from "@/components/admin/ui";
import { Link } from "@/i18n/navigation";
import { initAdminPage } from "@/lib/admin/page";
import { formatDateRange } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { saveEvent } from "./actions";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminEventsPage({ params }: Props) {
  const { locale, m } = await initAdminPage(params);
  const t = m.events;
  const supabase = await createClient();
  const { data: events } = await supabase.from("events").select("*").order("starts_on", { ascending: false });

  return (
    <div>
      <PageTitle>{t.title}</PageTitle>

      <section className={`${cardClass} mb-10`} aria-labelledby="new-event">
        <h2 id="new-event" className="mb-3 text-lg font-semibold">
          {t.newTitle}
        </h2>
        <EventForm action={saveEvent} locale={locale} messages={t} />
      </section>

      <section aria-labelledby="events-list">
        <h2 id="events-list" className="mb-3 text-lg font-semibold">
          {t.listTitle}
        </h2>
        {!events || events.length === 0 ? (
          <p className="text-zinc-700">{t.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass} data-testid="events-table">
              <thead className="border-b border-zinc-300">
                <tr>
                  <th scope="col" className={thClass}>{t.titleIt}</th>
                  <th scope="col" className={thClass}>{t.kind}</th>
                  <th scope="col" className={thClass}>{t.dates}</th>
                  <th scope="col" className={thClass}>{t.sourceCode}</th>
                  <th scope="col" className={thClass}>{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b border-zinc-200">
                    <td className={tdClass}>
                      <Link href={`/admin/eventi/${e.id}`} className="underline underline-offset-2">
                        {e.title_it}
                      </Link>
                    </td>
                    <td className={tdClass}>{t.kinds[e.kind as keyof typeof t.kinds] ?? e.kind}</td>
                    <td className={tdClass}>{formatDateRange(e.starts_on, e.ends_on, "it")}</td>
                    <td className={`${tdClass} font-mono text-xs`}>{e.source_code}</td>
                    <td className={tdClass}>
                      <Pill tone={e.published ? "good" : "neutral"}>{e.published ? t.publishedPill : t.draftPill}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
