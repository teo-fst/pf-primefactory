import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { EventForm } from "@/components/admin/event-form";
import { QrPngButton } from "@/components/admin/qr-png-button";
import { PageTitle, cardClass } from "@/components/admin/ui";
import { Link } from "@/i18n/navigation";
import { initAdminPage } from "@/lib/admin/page";
import { eventSignupUrl, isQrLocale, qrShape, qrSvg } from "@/lib/admin/qr";
import { createClient } from "@/lib/supabase/server";
import { deleteEvent, saveEvent } from "../actions";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminEventPage({ params, searchParams }: Props) {
  const { locale, m } = await initAdminPage(params);
  const { id } = await params;
  if (!/^\d{1,18}$/.test(id)) notFound();
  const t = m.events;

  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("*").eq("id", Number(id)).maybeSingle();
  if (!event) notFound();

  const rawLang = (await searchParams).lang;
  const lang = isQrLocale(rawLang) ? rawLang : "it";
  const url = eventSignupUrl(lang, event.source_code);
  const shape = qrShape(url);
  const svg = qrSvg(url);

  return (
    <div>
      <p className="mb-2 text-sm">
        <Link href="/admin/eventi" className="underline underline-offset-2">
          {t.backToList}
        </Link>
      </p>
      <PageTitle>{event.title_it}</PageTitle>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className={`${cardClass} lg:col-span-2`} aria-labelledby="edit-event">
          <h2 id="edit-event" className="mb-3 text-lg font-semibold">
            {t.editTitle}
          </h2>
          <EventForm action={saveEvent} locale={locale} messages={t} event={event} />
        </section>

        <div className="space-y-6">
          <section className={cardClass} aria-labelledby="event-qr">
            <h2 id="event-qr" className="mb-2 text-lg font-semibold">
              {t.qrTitle}
            </h2>
            <p className="mb-3 text-sm text-zinc-700">{t.qrIntro}</p>
            <p className="mb-3 flex gap-4 text-sm" aria-label={t.qrLanguage}>
              {(["it", "en"] as const).map((l) => (
                <Link
                  key={l}
                  href={`/admin/eventi/${id}?lang=${l}`}
                  aria-current={l === lang ? "true" : undefined}
                  className={l === lang ? "font-semibold underline underline-offset-4" : "underline underline-offset-4"}
                >
                  {l === "it" ? t.qrItalian : t.qrEnglish}
                </Link>
              ))}
            </p>
            <svg
              viewBox={`0 0 ${shape.size} ${shape.size}`}
              role="img"
              aria-label={`${t.qrTitle}: ${event.title_it}`}
              shapeRendering="crispEdges"
              className="mx-auto mb-3 size-56 rounded border border-zinc-300"
              data-testid="qr-preview"
            >
              <rect width={shape.size} height={shape.size} fill="#ffffff" />
              <path d={shape.path} fill="#000000" />
            </svg>
            <p className="mb-3 text-xs break-all text-zinc-600" data-testid="qr-url">
              {url}
            </p>
            <div className="flex flex-wrap gap-3">
              {/* Link normale: scarica il file, niente prefetch. */}
              <a
                href={`/${locale}/admin/eventi/${id}/qr?lang=${lang}`}
                download
                data-testid="qr-svg"
                className="inline-flex min-h-9 items-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium hover:bg-zinc-100"
              >
                {t.downloadSvg}
              </a>
              <QrPngButton svg={svg} filename={`qr-${event.source_code}-${lang}.png`} label={t.downloadPng} error={t.pngFailed} />
            </div>
          </section>

          <section className={cardClass} aria-labelledby="delete-event">
            <h2 id="delete-event" className="mb-2 text-lg font-semibold">
              {t.deleteTitle}
            </h2>
            <p className="mb-3 text-sm text-zinc-700">{t.deleteHint}</p>
            <ActionForm action={deleteEvent}>
              <input type="hidden" name="id" value={event.id} />
              <input type="hidden" name="locale" value={locale} />
              <SubmitButton variant="destructive" confirm={t.deleteConfirm}>
                {t.delete}
              </SubmitButton>
            </ActionForm>
          </section>
        </div>
      </div>
    </div>
  );
}
