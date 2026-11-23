import { notFound } from "next/navigation";
import { z } from "zod";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Pill, cardClass, formatDateTime } from "@/components/admin/ui";
import { inputClass } from "@/components/interest/field";
import { Link } from "@/i18n/navigation";
import { getUserEmail } from "@/lib/admin/auth-admin";
import { initAdminPage } from "@/lib/admin/page";
import { parseFormSchema, type FormField } from "@/lib/interest/form-schema";
import { createClient } from "@/lib/supabase/server";
import { changeRequestStatus, postRequestMessage } from "../actions";

type Props = { params: Promise<{ locale: string; id: string }> };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function detailValue(field: FormField | undefined, value: unknown, yes: string, no: string): string {
  if (typeof value === "boolean") return value ? yes : no;
  if (field?.type === "select" && typeof value === "string") {
    return field.options?.find((o) => o.value === value)?.label_it ?? value;
  }
  return String(value);
}

export default async function RequestDetailPage({ params }: Props) {
  const { locale, m } = await initAdminPage(params);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const t = m.requests;

  const supabase = await createClient();
  const { data: request } = await supabase
    .from("requests")
    .select("*, business_lines(name_it, form_schema), profiles(full_name, phone)")
    .eq("id", id)
    .maybeSingle();
  if (!request) notFound();

  const [{ data: statuses }, { data: history }, { data: files }, { data: messages }, email] = await Promise.all([
    supabase.from("request_statuses").select("code, label_it, visible_to_client").order("sort"),
    supabase
      .from("request_status_history")
      .select("id, from_status, to_status, note, created_at, profiles(full_name)")
      .eq("request_id", id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("request_files")
      .select("id, original_name, size_bytes, created_at, synced_at")
      .eq("request_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("request_messages")
      .select("id, body, internal, created_at, profiles(full_name, role)")
      .eq("request_id", id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
    getUserEmail(request.customer_id),
  ]);

  const labelOf = new Map((statuses ?? []).map((s) => [s.code, s.label_it]));
  const schemaFields = parseFormSchema(request.business_lines?.form_schema);
  const fieldByKey = new Map(schemaFields.map((f) => [f.key, f]));
  const details = Object.entries((request.details ?? {}) as Record<string, unknown>);
  const dateOnly = new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeZone: "UTC" });

  return (
    <div>
      <p className="mb-2 text-sm">
        <Link href="/admin/richieste" className="underline underline-offset-2">
          {t.backToList}
        </Link>
      </p>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-semibold tracking-tight" data-testid="request-code">
          {request.public_code}
        </h1>
        <Pill>{labelOf.get(request.status) ?? request.status}</Pill>
        <Pill tone="neutral">{request.kind === "preventivo" ? t.kindQuote : t.kindInterest}</Pill>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className={cardClass} aria-labelledby="request-data">
            <h2 id="request-data" className="mb-3 text-lg font-semibold">
              {t.requestData}
            </h2>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-zinc-600">{t.colLine}</dt>
              <dd>{request.business_lines?.name_it ?? "—"}</dd>
              <dt className="text-zinc-600">{t.description}</dt>
              <dd className="whitespace-pre-wrap">{request.description}</dd>
              <dt className="text-zinc-600">{t.measures}</dt>
              <dd className="whitespace-pre-wrap">{request.measures || "—"}</dd>
              <dt className="text-zinc-600">{t.deadline}</dt>
              <dd>{request.deadline ? dateOnly.format(new Date(`${request.deadline}T00:00:00Z`)) : "—"}</dd>
              <dt className="text-zinc-600">{t.colSource}</dt>
              <dd className="font-mono">{request.source ?? "—"}</dd>
              <dt className="text-zinc-600">{t.colDate}</dt>
              <dd>{formatDateTime(request.created_at, locale)}</dd>
              <dt className="text-zinc-600">{t.privacyConsent}</dt>
              <dd>{formatDateTime(request.privacy_consent_at, locale)}</dd>
            </dl>
          </section>

          <section className={cardClass} aria-labelledby="request-details">
            <h2 id="request-details" className="mb-3 text-lg font-semibold">
              {t.dynamicFields}
            </h2>
            {details.length === 0 ? (
              <p className="text-sm text-zinc-700">{t.noDynamicFields}</p>
            ) : (
              <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm" data-testid="request-details">
                {details.map(([key, value]) => {
                  const def = fieldByKey.get(key);
                  return (
                    <div key={key} className="contents">
                      <dt className="text-zinc-600">{def?.label_it ?? key}</dt>
                      <dd>{detailValue(def, value, m.common.yes, m.common.no)}</dd>
                    </div>
                  );
                })}
              </dl>
            )}
          </section>

          <section className={cardClass} aria-labelledby="request-files">
            <h2 id="request-files" className="mb-3 text-lg font-semibold">
              {t.files}
            </h2>
            {!files || files.length === 0 ? (
              <p className="text-sm text-zinc-700">{t.noFiles}</p>
            ) : (
              <ul className="divide-y divide-zinc-200" data-testid="request-files">
                {files.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span>
                      {/* Link normale (non <Link>): evita il prefetch, che scaricherebbe il file. */}
                      <a
                        href={`/${locale}/admin/richieste/${id}/file/${f.id}`}
                        className="underline underline-offset-2"
                        data-testid="download-file"
                      >
                        {f.original_name}
                      </a>{" "}
                      <span className="text-zinc-600">({formatBytes(f.size_bytes)})</span>
                    </span>
                    <span className="flex items-center gap-2 text-zinc-600">
                      {formatDateTime(f.created_at, locale)}
                      <Pill tone={f.synced_at ? "good" : "warn"}>{f.synced_at ? t.fileSynced : t.filePending}</Pill>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-zinc-500">{t.downloadHint}</p>
          </section>

          <section className={cardClass} aria-labelledby="request-conversation">
            <h2 id="request-conversation" className="mb-3 text-lg font-semibold">
              {t.conversation}
            </h2>
            {!messages || messages.length === 0 ? (
              <p className="text-sm text-zinc-700">{t.noMessages}</p>
            ) : (
              <ul className="mb-4 space-y-3" data-testid="request-messages">
                {messages.map((msg) => (
                  <li
                    key={msg.id}
                    data-internal={msg.internal}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      msg.internal ? "border-amber-300 bg-amber-50" : "border-zinc-300 bg-white"
                    }`}
                  >
                    <p className="mb-1 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                      <span className="font-medium">{msg.profiles?.full_name || t.unknownAuthor}</span>
                      <span>{formatDateTime(msg.created_at, locale)}</span>
                      {msg.internal ? <Pill tone="warn">{t.internalNote}</Pill> : <Pill>{t.publicMessage}</Pill>}
                    </p>
                    <p className="whitespace-pre-wrap">{msg.body}</p>
                  </li>
                ))}
              </ul>
            )}

            <ActionForm action={postRequestMessage} className="flex flex-col gap-3" testId="message-form" resetOnSuccess>
              <input type="hidden" name="request_id" value={id} />
              <label className="flex flex-col gap-1 text-sm font-medium">
                {t.messageBody}
                <textarea name="body" required rows={3} maxLength={5000} className={inputClass} />
              </label>
              <fieldset className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <legend className="mb-1 font-medium">{t.messageVisibility}</legend>
                <label className="flex items-center gap-2">
                  <input type="radio" name="visibility" value="internal" defaultChecked /> {t.visibilityInternal}
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="visibility" value="public" /> {t.visibilityPublic}
                </label>
              </fieldset>
              <div>
                <SubmitButton>{t.send}</SubmitButton>
              </div>
            </ActionForm>
          </section>
        </div>

        <div className="space-y-6">
          <section className={cardClass} aria-labelledby="request-customer">
            <h2 id="request-customer" className="mb-3 text-lg font-semibold">
              {t.customer}
            </h2>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm" data-testid="request-customer">
              <dt className="text-zinc-600">{t.customerName}</dt>
              <dd>{request.profiles?.full_name || "—"}</dd>
              <dt className="text-zinc-600">{t.customerEmail}</dt>
              <dd className="break-all">{email ?? "—"}</dd>
              <dt className="text-zinc-600">{t.customerPhone}</dt>
              <dd>{request.profiles?.phone || "—"}</dd>
            </dl>
          </section>

          <section className={cardClass} aria-labelledby="request-status">
            <h2 id="request-status" className="mb-3 text-lg font-semibold">
              {t.changeStatus}
            </h2>
            <ActionForm action={changeRequestStatus} className="flex flex-col gap-3" testId="status-form">
              <input type="hidden" name="request_id" value={id} />
              <label className="flex flex-col gap-1 text-sm font-medium">
                {t.newStatus}
                <select key={request.status} name="status" defaultValue={request.status} className={inputClass}>
                  {(statuses ?? []).map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.label_it}
                      {s.visible_to_client ? "" : ` (${t.hiddenFromClient})`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                {t.statusNote}
                <textarea name="note" rows={2} maxLength={1000} className={inputClass} />
                <span className="text-xs font-normal text-zinc-500">{t.statusNoteHint}</span>
              </label>
              <div>
                <SubmitButton>{t.saveStatus}</SubmitButton>
              </div>
            </ActionForm>
          </section>

          <section className={cardClass} aria-labelledby="request-history">
            <h2 id="request-history" className="mb-3 text-lg font-semibold">
              {t.history}
            </h2>
            <ol className="space-y-3 text-sm" data-testid="request-history">
              {(history ?? []).map((h) => (
                <li key={h.id} className="border-l-2 border-zinc-300 pl-3">
                  <p className="font-medium">
                    {h.from_status ? `${labelOf.get(h.from_status) ?? h.from_status} → ` : ""}
                    {labelOf.get(h.to_status) ?? h.to_status}
                  </p>
                  <p className="text-xs text-zinc-600">
                    {formatDateTime(h.created_at, locale)}
                    {h.profiles?.full_name ? ` · ${h.profiles.full_name}` : ""}
                  </p>
                  {h.note ? <p className="mt-1 whitespace-pre-wrap" data-testid="history-note">{h.note}</p> : null}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
