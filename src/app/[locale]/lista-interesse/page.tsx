import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { InterestForm, type InterestFormMessages } from "@/components/interest/interest-form";
import { routing } from "@/i18n/routing";
import { loadInterestPage } from "@/lib/interest/page-data";
import { parseSource } from "@/lib/interest/schema";
import { getTurnstileSiteKey } from "@/lib/security/turnstile";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function getFormMessages(locale: string): Promise<InterestFormMessages> {
  const messages = await getMessages({ locale });
  return messages.interestForm as unknown as InterestFormMessages;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const [data, m] = await Promise.all([loadInterestPage(locale), getFormMessages(locale)]);
  if (data.status !== "ok") return { title: m.titleInterest };
  return { title: data.quoteMode ? m.titleQuote : (data.texts["interest.title"] ?? m.titleInterest) };
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InterestPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [data, m, query] = await Promise.all([loadInterestPage(locale), getFormMessages(locale), searchParams]);
  if (data.status === "not_found") notFound();

  if (data.status === "unavailable") {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">{m.titleInterest}</h1>
        <p role="alert" className="mt-4 text-zinc-700">
          {m.unavailable}
        </p>
      </div>
    );
  }

  // "fonte" (QR di un evento) e "linea" (link dalle pagine delle linee) arrivano dall'indirizzo: non fidati.
  const source = parseSource(first(query.fonte));
  const requestedLine = first(query.linea);
  const initialLine = data.lines.find((l) => l.slug === requestedLine)?.slug ?? "";

  const title = data.quoteMode ? m.titleQuote : (data.texts["interest.title"] ?? m.titleInterest);
  const intro = data.quoteMode ? m.introQuote : (data.texts["interest.intro"] ?? m.introInterest);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 mb-8 text-zinc-700">{intro}</p>
      <InterestForm
        locale={locale}
        quoteMode={data.quoteMode}
        lines={data.lines.map((l) => ({ slug: l.slug, name: l.name, fields: l.fields }))}
        initialLine={initialLine}
        source={source}
        turnstileSiteKey={getTurnstileSiteKey()}
        messages={m}
      />
    </div>
  );
}
