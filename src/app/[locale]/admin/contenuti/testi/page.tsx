import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { PageTitle, Pager, Pill, cardClass } from "@/components/admin/ui";
import { inputClass } from "@/components/interest/field";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { initAdminPage } from "@/lib/admin/page";
import { fallbackTexts } from "@/lib/content/texts";
import { createClient } from "@/lib/supabase/server";
import { resetSiteText, saveSiteText } from "../actions";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const PER_PAGE = 12;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

// Editor dei testi del sito (Q33): IT e EN affiancati, ricerca per chiave (o per parte del testo).
// Per ogni testo si mostra il valore in uso: quello del database se è stato modificato, altrimenti il predefinito.
export default async function TextsPage({ params, searchParams }: Props) {
  const { m } = await initAdminPage(params);
  const t = m.content;
  const query = await searchParams;
  const q = first(query.q).trim().slice(0, 100);
  const page = Math.max(1, Math.min(10_000, Number.parseInt(first(query.pagina), 10) || 1));

  const supabase = await createClient();
  const { data: rows } = await supabase.from("site_texts").select("key, locale, value").limit(5000);

  const defaultsIt = fallbackTexts("it");
  const defaultsEn = fallbackTexts("en");
  const dbIt = new Map<string, string>();
  const dbEn = new Map<string, string>();
  for (const row of rows ?? []) (row.locale === "it" ? dbIt : row.locale === "en" ? dbEn : new Map()).set(row.key, row.value);

  const keys = [...new Set([...Object.keys(defaultsIt), ...dbIt.keys(), ...dbEn.keys()])].sort();
  const needle = q.toLowerCase();
  const filtered = needle
    ? keys.filter((key) => {
        const it = dbIt.get(key) ?? defaultsIt[key] ?? "";
        const en = dbEn.get(key) ?? defaultsEn[key] ?? "";
        return key.includes(needle) || it.toLowerCase().includes(needle) || en.toLowerCase().includes(needle);
      })
    : keys;
  const pageKeys = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const hrefFor = (p: number) => {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (p > 1) search.set("pagina", String(p));
    const s = search.toString();
    return s ? `/admin/contenuti/testi?${s}` : "/admin/contenuti/testi";
  };

  return (
    <div>
      <PageTitle>{t.textsTitle}</PageTitle>
      <p className="mb-4 max-w-2xl text-sm text-zinc-700">{t.textsIntro}</p>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3" role="search">
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t.search}
          <input name="q" defaultValue={q} maxLength={100} className={`${inputClass} w-72`} placeholder={t.searchHint} />
        </label>
        <Button type="submit" className="min-h-9">
          {t.searchButton}
        </Button>
        {q ? (
          <Link href="/admin/contenuti/testi" className="text-sm underline underline-offset-2">
            {t.searchReset}
          </Link>
        ) : null}
      </form>

      {pageKeys.length === 0 ? (
        <p className="text-zinc-700">{t.noTexts}</p>
      ) : (
        <ul className="space-y-4" data-testid="texts-list">
          {pageKeys.map((key) => {
            const customized = dbIt.has(key) || dbEn.has(key);
            const hasDefault = key in defaultsIt;
            return (
              <li key={key} className={cardClass} data-testid="text-row" data-key={key}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <code className="text-sm font-semibold">{key}</code>
                  {customized ? <Pill tone="warn">{t.customized}</Pill> : <Pill>{t.default}</Pill>}
                </div>
                <ActionForm action={saveSiteText} className="flex flex-col gap-3">
                  <input type="hidden" name="key" value={key} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-1 text-sm font-medium">
                      {t.italian}
                      <textarea
                        name="value_it"
                        required
                        rows={3}
                        maxLength={5000}
                        defaultValue={dbIt.get(key) ?? defaultsIt[key] ?? ""}
                        className={inputClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-medium">
                      {t.english}
                      <textarea
                        name="value_en"
                        rows={3}
                        maxLength={5000}
                        defaultValue={dbEn.get(key) ?? defaultsEn[key] ?? ""}
                        className={inputClass}
                      />
                    </label>
                  </div>
                  <div>
                    <SubmitButton>{t.save}</SubmitButton>
                  </div>
                </ActionForm>
                {customized && hasDefault ? (
                  <ActionForm action={resetSiteText} className="mt-2">
                    <input type="hidden" name="key" value={key} />
                    <SubmitButton variant="outline" confirm={t.resetConfirm}>
                      {t.reset}
                    </SubmitButton>
                  </ActionForm>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <Pager
        page={page}
        total={filtered.length}
        pageSize={PER_PAGE}
        hrefFor={hrefFor}
        labels={{ prev: m.requests.prev, next: m.requests.next, summary: m.requests.pagerSummary }}
      />
    </div>
  );
}
