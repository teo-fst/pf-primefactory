import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { MessageForm } from "@/components/account/message-form";
import { UploadForm, type AccountMessages } from "@/components/account/upload-form";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { describeDetails } from "@/lib/account/details";
import { formatBytes, parseMaxUploadBytes } from "@/lib/account/files";
import { requireUser } from "@/lib/auth/session";
import { intlLocale } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ locale: string; codice: string }> };

export const metadata: Metadata = { robots: { index: false, follow: false } };

const CODE_RE = /^PF-\d{2}-\d{4,}$/;

// Dettaglio di UNA richiesta del cliente (F1.8). Tutto si legge con il client della sessione: la RLS
// mostra solo righe del proprietario (e senza note interne né stati non visibili al cliente).
// Il filtro su customer_id serve a non mostrare, a un admin che apre l'indirizzo, la richiesta di un altro.
export default async function RequestDetailPage({ params }: Props) {
  const { locale, codice } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  if (!CODE_RE.test(codice)) notFound();

  const { user } = await requireUser(locale);
  const m = (await getMessages({ locale })).account as unknown as AccountMessages;
  const supabase = await createClient();

  const { data: request } = await supabase
    .from("requests")
    .select(
      "id, public_code, kind, status, description, measures, deadline, details, created_at, business_lines(name_it, name_en, form_schema), request_statuses(label_it, label_en)",
    )
    .eq("public_code", codice)
    .eq("customer_id", user.id)
    .maybeSingle();
  if (!request) notFound();

  const [history, files, messages, setting] = await Promise.all([
    supabase
      .from("request_status_history")
      .select("id, created_at, status:request_statuses!request_status_history_to_status_fkey(label_it, label_en)")
      .eq("request_id", request.id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("request_files")
      .select("id, original_name, size_bytes, created_at")
      .eq("request_id", request.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("request_messages")
      .select("id, author_id, body, created_at")
      .eq("request_id", request.id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
    supabase.from("site_settings").select("value").eq("key", "max_upload_bytes").maybeSingle(),
  ]);

  const maxBytes = parseMaxUploadBytes(setting.data?.value);
  const fmtLocale = intlLocale(locale);
  const dateFormat = new Intl.DateTimeFormat(fmtLocale, { dateStyle: "medium", timeZone: "Europe/Rome" });
  const dateTimeFormat = new Intl.DateTimeFormat(fmtLocale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  });
  const pick = (it: string, en: string) => (locale === "en" ? en : it);
  const detailRows = describeDetails(
    request.business_lines?.form_schema,
    request.details,
    locale,
    { yes: m.yes, no: m.no },
    (iso) => dateFormat.format(new Date(`${iso}T00:00:00Z`)),
  );
  const timeline = history.data ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <p className="mb-4 text-sm">
        <Link href="/area-clienti" className="underline underline-offset-2">
          ← {m.backToList}
        </Link>
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">{m.requestTitle.replace("{code}", request.public_code)}</h1>

      <section aria-labelledby="sec-request" className="mt-8">
        <h2 id="sec-request" className="mb-3 text-xl font-semibold">
          {m.sectionRequest}
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="text-zinc-600">{m.labelType}</dt>
          <dd>{request.kind === "preventivo" ? m.kindQuote : m.kindInterest}</dd>
          <dt className="text-zinc-600">{m.labelLine}</dt>
          <dd>{request.business_lines ? pick(request.business_lines.name_it, request.business_lines.name_en) : "—"}</dd>
          <dt className="text-zinc-600">{m.labelStatus}</dt>
          <dd data-testid="request-status">
            {request.request_statuses ? pick(request.request_statuses.label_it, request.request_statuses.label_en) : "—"}
          </dd>
          <dt className="text-zinc-600">{m.labelDate}</dt>
          <dd>{dateFormat.format(new Date(request.created_at))}</dd>
          <dt className="text-zinc-600">{m.labelDescription}</dt>
          <dd className="whitespace-pre-wrap break-words">{request.description}</dd>
          {request.measures ? (
            <>
              <dt className="text-zinc-600">{m.labelMeasures}</dt>
              <dd className="whitespace-pre-wrap break-words">{request.measures}</dd>
            </>
          ) : null}
          {request.deadline ? (
            <>
              <dt className="text-zinc-600">{m.labelDeadline}</dt>
              <dd>{dateFormat.format(new Date(`${request.deadline}T00:00:00Z`))}</dd>
            </>
          ) : null}
        </dl>

        {detailRows.length > 0 ? (
          <>
            <h3 className="mt-6 mb-2 font-medium">{m.sectionDetails}</h3>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-[10rem_1fr]" data-testid="request-details">
              {detailRows.map((row) => (
                <div key={row.key} className="contents">
                  <dt className="text-zinc-600">{row.label}</dt>
                  <dd className="break-words">{row.value}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : null}
      </section>

      <section aria-labelledby="sec-timeline" className="mt-10">
        <h2 id="sec-timeline" className="mb-3 text-xl font-semibold">
          {m.sectionTimeline}
        </h2>
        {history.error || timeline.length === 0 ? (
          <p className="text-sm text-zinc-700">{m.timelineEmpty}</p>
        ) : (
          <ol className="flex flex-col gap-2 border-l border-zinc-300 pl-4 text-sm" data-testid="timeline">
            {timeline.map((entry, index) => (
              <li key={entry.id} aria-current={index === timeline.length - 1 ? "step" : undefined}>
                <span className={index === timeline.length - 1 ? "font-semibold" : undefined}>
                  {entry.status ? pick(entry.status.label_it, entry.status.label_en) : "—"}
                </span>
                <span className="ml-2 text-zinc-600">{dateTimeFormat.format(new Date(entry.created_at))}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="sec-files" className="mt-10">
        <h2 id="sec-files" className="mb-3 text-xl font-semibold">
          {m.sectionFiles}
        </h2>
        {(files.data ?? []).length === 0 ? (
          <p className="mb-4 text-sm text-zinc-700">{m.filesEmpty}</p>
        ) : (
          <ul className="mb-6 flex flex-col divide-y divide-zinc-200 text-sm" data-testid="files-list">
            {(files.data ?? []).map((file) => (
              <li key={file.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span className="break-all">
                  {file.original_name}
                  <span className="ml-2 text-zinc-600">{formatBytes(file.size_bytes, locale)}</span>
                </span>
                <a
                  href={`/${locale}/area-clienti/${request.public_code}/file/${file.id}`}
                  className="underline underline-offset-2"
                >
                  {m.download}
                </a>
              </li>
            ))}
          </ul>
        )}
        <h3 className="mb-2 font-medium">{m.uploadTitle}</h3>
        <UploadForm requestId={request.id} maxBytes={maxBytes} locale={locale} messages={m} />
      </section>

      <section aria-labelledby="sec-messages" className="mt-10">
        <h2 id="sec-messages" className="mb-3 text-xl font-semibold">
          {m.sectionMessages}
        </h2>
        {(messages.data ?? []).length === 0 ? (
          <p className="mb-4 text-sm text-zinc-700">{m.messagesEmpty}</p>
        ) : (
          <ul className="mb-6 flex flex-col gap-3" data-testid="messages-list">
            {(messages.data ?? []).map((msg) => {
              const mine = msg.author_id === user.id;
              return (
                <li
                  key={msg.id}
                  className={`rounded-lg border px-3 py-2 text-sm ${mine ? "border-zinc-300 bg-zinc-50" : "border-zinc-400 bg-white"}`}
                >
                  <p className="mb-1 text-xs text-zinc-600">
                    <span className="font-medium text-zinc-800">{mine ? m.messageFromYou : m.messageFromTeam}</span>
                    {" · "}
                    {dateTimeFormat.format(new Date(msg.created_at))}
                  </p>
                  {/* Testo semplice: React lo escapa, niente HTML. */}
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                </li>
              );
            })}
          </ul>
        )}
        <MessageForm requestId={request.id} messages={m} />
      </section>
    </div>
  );
}
