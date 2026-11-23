import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { PortfolioUpload } from "@/components/admin/portfolio-upload";
import { PageTitle, Pill, cardClass } from "@/components/admin/ui";
import { inputClass } from "@/components/interest/field";
import { initAdminPage } from "@/lib/admin/page";
import { portfolioImageUrl } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";
import { createPortfolioItem, deletePortfolioItem, updatePortfolioItem } from "./actions";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminPortfolioPage({ params }: Props) {
  const { m } = await initAdminPage(params);
  const t = m.portfolio;
  const supabase = await createClient();

  const [{ data: lines }, { data: items }] = await Promise.all([
    supabase.from("business_lines").select("id, name_it").order("sort"),
    supabase
      .from("portfolio_items")
      .select("*")
      .order("sort", { ascending: true })
      .order("created_at", { ascending: false }),
  ]);
  const lineOptions = (lines ?? []).map((l) => ({ id: l.id, name: l.name_it }));

  return (
    <div>
      <PageTitle>{t.title}</PageTitle>
      <p className="mb-6 max-w-2xl text-sm text-zinc-700">{t.intro}</p>

      <section className={`${cardClass} mb-10`} aria-labelledby="upload-title">
        <h2 id="upload-title" className="mb-3 text-lg font-semibold">
          {t.uploadTitle}
        </h2>
        <PortfolioUpload lines={lineOptions} messages={t} createItem={createPortfolioItem} />
      </section>

      <section aria-labelledby="items-title">
        <h2 id="items-title" className="mb-3 text-lg font-semibold">
          {t.itemsTitle}
        </h2>
        {!items || items.length === 0 ? (
          <p className="text-zinc-700">{t.empty}</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2" data-testid="portfolio-items">
            {items.map((item) => {
              const src = portfolioImageUrl(item.image_path);
              return (
                <li key={item.id} className={`${cardClass} flex flex-col gap-3`} data-testid="portfolio-item">
                  <div className="flex items-start gap-4">
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt={item.caption_it || t.noCaption}
                        loading="lazy"
                        decoding="async"
                        className="h-28 w-36 shrink-0 rounded border border-zinc-200 object-cover"
                      />
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Pill tone={item.published ? "good" : "neutral"}>{item.published ? t.published : t.hidden}</Pill>
                      <Pill tone={item.rights_transferred ? "good" : "warn"}>
                        {item.rights_transferred ? t.rightsOk : t.rightsMissing}
                      </Pill>
                    </div>
                  </div>

                  <ActionForm action={updatePortfolioItem} className="flex flex-col gap-3">
                    <input type="hidden" name="id" value={item.id} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1 text-sm font-medium">
                        {t.line}
                        <select key={item.business_line_id ?? "none"} name="line_id" defaultValue={item.business_line_id ?? ""} className={inputClass}>
                          <option value="">{t.noLine}</option>
                          {lineOptions.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-sm font-medium">
                        {t.sort}
                        <input name="sort" type="number" defaultValue={item.sort} className={inputClass} />
                      </label>
                      <label className="flex flex-col gap-1 text-sm font-medium">
                        {t.captionIt}
                        <input name="caption_it" defaultValue={item.caption_it} maxLength={300} className={inputClass} />
                      </label>
                      <label className="flex flex-col gap-1 text-sm font-medium">
                        {t.captionEn}
                        <input name="caption_en" defaultValue={item.caption_en} maxLength={300} className={inputClass} />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="rights_transferred" defaultChecked={item.rights_transferred} /> {t.rights}
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="published" defaultChecked={item.published} /> {t.publishedLabel}
                      </label>
                    </div>
                    <div>
                      <SubmitButton>{t.save}</SubmitButton>
                    </div>
                  </ActionForm>

                  <ActionForm action={deletePortfolioItem}>
                    <input type="hidden" name="id" value={item.id} />
                    <SubmitButton variant="destructive" confirm={t.deleteConfirm}>
                      {t.delete}
                    </SubmitButton>
                  </ActionForm>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
