import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { PageTitle, Pill, cardClass, tableClass, tdClass, thClass } from "@/components/admin/ui";
import { inputClass } from "@/components/interest/field";
import { initAdminPage } from "@/lib/admin/page";
import { createClient } from "@/lib/supabase/server";
import { setLineSettings, setPageVisibility, setQuoteMode } from "../actions";

type Props = { params: Promise<{ locale: string }> };

const TONES = { attiva: "good", in_sviluppo: "warn", oscurata: "bad" } as const;

export default async function VisibilityPage({ params }: Props) {
  const { m } = await initAdminPage(params);
  const t = m.content;
  const supabase = await createClient();

  const [{ data: pages }, { data: lines }, { data: setting }] = await Promise.all([
    supabase.from("pages").select("slug, title_it, visibility").order("sort"),
    supabase.from("business_lines").select("slug, name_it, visibility, accepts_requests").order("sort"),
    supabase.from("site_settings").select("value").eq("key", "quote_mode").maybeSingle(),
  ]);
  const quoteMode = setting?.value === true;

  const visibilityOptions = (
    <>
      <option value="attiva">{t.visibility.attiva}</option>
      <option value="in_sviluppo">{t.visibility.in_sviluppo}</option>
      <option value="oscurata">{t.visibility.oscurata}</option>
    </>
  );

  return (
    <div>
      <PageTitle>{t.visibilityTitle}</PageTitle>
      <p className="mb-6 max-w-2xl text-sm text-zinc-700">{t.visibilityIntro}</p>

      <section className={`${cardClass} mb-10`} aria-labelledby="quote-mode" data-testid="quote-mode">
        <h2 id="quote-mode" className="mb-2 text-lg font-semibold">
          {t.quoteTitle}
        </h2>
        <p className="mb-3 text-sm">
          {t.quoteCurrent}: <Pill tone={quoteMode ? "warn" : "good"}>{quoteMode ? t.quoteModeOn : t.quoteModeOff}</Pill>
        </p>
        <p className="mb-3 max-w-2xl text-sm text-zinc-700">{t.quoteHint}</p>
        <ActionForm action={setQuoteMode}>
          <input type="hidden" name="enabled" value={quoteMode ? "false" : "true"} />
          <SubmitButton variant="outline" confirm={quoteMode ? t.quoteConfirmOff : t.quoteConfirmOn}>
            {quoteMode ? t.quoteSwitchOff : t.quoteSwitchOn}
          </SubmitButton>
        </ActionForm>
      </section>

      <section className="mb-10" aria-labelledby="lines-title">
        <h2 id="lines-title" className="mb-3 text-lg font-semibold">
          {t.linesTitle}
        </h2>
        <div className="overflow-x-auto">
          <table className={tableClass} data-testid="lines-table">
            <thead className="border-b border-zinc-300">
              <tr>
                <th scope="col" className={thClass}>{t.colName}</th>
                <th scope="col" className={thClass}>{t.colVisibility}</th>
                <th scope="col" className={thClass}>{t.colAccepts}</th>
                <th scope="col" className={thClass}><span className="sr-only">{t.save}</span></th>
              </tr>
            </thead>
            <tbody>
              {(lines ?? []).map((l) => (
                <tr key={l.slug} className="border-b border-zinc-200">
                  <td className={tdClass}>
                    {l.name_it} <Pill tone={TONES[l.visibility]}>{t.visibility[l.visibility]}</Pill>
                  </td>
                  <td colSpan={3} className={tdClass}>
                    <ActionForm action={setLineSettings} className="flex flex-wrap items-center gap-4" testId={`line-${l.slug}`}>
                      <input type="hidden" name="slug" value={l.slug} />
                      <select key={l.visibility} name="visibility" defaultValue={l.visibility} aria-label={`${t.colVisibility}: ${l.name_it}`} className={`${inputClass} w-44`}>
                        {visibilityOptions}
                      </select>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="accepts_requests" defaultChecked={l.accepts_requests} /> {t.acceptsRequests}
                      </label>
                      <SubmitButton variant="outline">{t.save}</SubmitButton>
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="pages-title">
        <h2 id="pages-title" className="mb-3 text-lg font-semibold">
          {t.pagesTitle}
        </h2>
        <div className="overflow-x-auto">
          <table className={tableClass} data-testid="pages-table">
            <thead className="border-b border-zinc-300">
              <tr>
                <th scope="col" className={thClass}>{t.colName}</th>
                <th scope="col" className={thClass}>{t.colVisibility}</th>
              </tr>
            </thead>
            <tbody>
              {(pages ?? []).map((p) => (
                <tr key={p.slug} className="border-b border-zinc-200">
                  <td className={tdClass}>
                    {p.title_it} <code className="text-xs text-zinc-500">/{p.slug}</code>{" "}
                    <Pill tone={TONES[p.visibility]}>{t.visibility[p.visibility]}</Pill>
                  </td>
                  <td className={tdClass}>
                    <ActionForm action={setPageVisibility} className="flex flex-wrap items-center gap-4" testId={`page-${p.slug}`}>
                      <input type="hidden" name="slug" value={p.slug} />
                      <select key={p.visibility} name="visibility" defaultValue={p.visibility} aria-label={`${t.colVisibility}: ${p.title_it}`} className={`${inputClass} w-44`}>
                        {visibilityOptions}
                      </select>
                      <SubmitButton variant="outline">{t.save}</SubmitButton>
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
