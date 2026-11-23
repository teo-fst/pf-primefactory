import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import type itMessages from "../../../../messages/it.json";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ locale: string }> };
type AccountMessages = (typeof itMessages)["account"];

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Area clienti minima (F1.7): elenco delle PROPRIE richieste. La versione completa (file, conversazione)
// arriva con F1.8. I dati si leggono con il client della sessione: la RLS è la vera barriera, e il filtro
// su customer_id serve a non mostrare agli admin anche le richieste degli altri in questa pagina.
export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const { user } = await requireUser(locale);
  const m = (await getMessages({ locale })).account as unknown as AccountMessages;

  const supabase = await createClient();
  const { data: requests, error } = await supabase
    .from("requests")
    .select("id, public_code, kind, created_at, business_lines(name_it, name_en), request_statuses(label_it, label_en)")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Europe/Rome" });
  const pick = (it: string, en: string) => (locale === "en" ? en : it);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{m.title}</h1>
          {user.email ? (
            <p className="mt-2 text-sm text-zinc-600">
              {m.loggedInAs} <span className="font-medium">{user.email}</span>
            </p>
          ) : null}
        </div>
        <form method="post" action="/auth/logout">
          <input type="hidden" name="locale" value={locale} />
          <Button type="submit" variant="outline">
            {m.logout}
          </Button>
        </form>
      </div>

      <h2 className="mt-10 mb-4 text-xl font-semibold">{m.requestsTitle}</h2>

      {error ? (
        <p role="alert" className="text-red-700">
          {m.loadError}
        </p>
      ) : requests.length === 0 ? (
        <p className="text-zinc-700">{m.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" data-testid="requests-table">
            <thead className="border-b border-zinc-300 text-zinc-600">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">{m.colCode}</th>
                <th scope="col" className="py-2 pr-4 font-medium">{m.colType}</th>
                <th scope="col" className="py-2 pr-4 font-medium">{m.colLine}</th>
                <th scope="col" className="py-2 pr-4 font-medium">{m.colStatus}</th>
                <th scope="col" className="py-2 font-medium">{m.colDate}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-zinc-200">
                  <td className="py-2 pr-4 font-mono">{r.public_code}</td>
                  <td className="py-2 pr-4">{r.kind === "preventivo" ? m.kindQuote : m.kindInterest}</td>
                  <td className="py-2 pr-4">
                    {r.business_lines ? pick(r.business_lines.name_it, r.business_lines.name_en) : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    {r.request_statuses ? pick(r.request_statuses.label_it, r.request_statuses.label_en) : "—"}
                  </td>
                  <td className="py-2">{dateFormat.format(new Date(r.created_at))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-8 flex flex-wrap items-center gap-4 text-sm text-zinc-600">
        <Link href="/lista-interesse" className="underline underline-offset-2">
          {m.newRequest}
        </Link>
        <span>{m.comingSoon}</span>
      </p>
    </main>
  );
}
