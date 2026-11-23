import { FormSchemaEditor } from "@/components/admin/form-schema-editor";
import { PageTitle, cardClass } from "@/components/admin/ui";
import { Link } from "@/i18n/navigation";
import { initAdminPage } from "@/lib/admin/page";
import { createClient } from "@/lib/supabase/server";
import { saveFormSchema } from "../actions";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Campi aggiuntivi del modulo d'interesse per ogni linea (Q43).
export default async function FormSchemaPage({ params, searchParams }: Props) {
  const { m } = await initAdminPage(params);
  const t = m.content;
  const rawLine = (await searchParams).linea;
  const wanted = Array.isArray(rawLine) ? rawLine[0] : rawLine;

  const supabase = await createClient();
  const { data: lines } = await supabase.from("business_lines").select("slug, name_it, form_schema").order("sort");
  const current = (lines ?? []).find((l) => l.slug === wanted) ?? (lines ?? [])[0];

  return (
    <div>
      <PageTitle>{t.formsTitle}</PageTitle>
      <p className="mb-4 max-w-2xl text-sm text-zinc-700">{t.formsIntro}</p>

      <p className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-label={t.formsPickLine}>
        {(lines ?? []).map((l) => (
          <Link
            key={l.slug}
            href={`/admin/contenuti/moduli?linea=${l.slug}`}
            aria-current={l.slug === current?.slug ? "true" : undefined}
            className={l.slug === current?.slug ? "font-semibold underline underline-offset-4" : "underline underline-offset-4"}
          >
            {l.name_it}
          </Link>
        ))}
      </p>

      {current ? (
        <section className={cardClass} aria-labelledby="schema-title">
          <h2 id="schema-title" className="mb-1 text-lg font-semibold">
            {current.name_it}
          </h2>
          <p className="mb-4 text-xs text-zinc-600">{t.formsFormat}</p>
          {/* key: cambiando linea l'editor riparte dal testo giusto */}
          <FormSchemaEditor
            key={current.slug}
            action={saveFormSchema}
            slug={current.slug}
            initial={JSON.stringify(current.form_schema, null, 2)}
            messages={t}
          />
        </section>
      ) : (
        <p className="text-zinc-700">{t.noLines}</p>
      )}
    </div>
  );
}
