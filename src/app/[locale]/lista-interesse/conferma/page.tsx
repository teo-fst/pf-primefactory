import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import type { InterestFormMessages } from "@/components/interest/interest-form";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getSiteTexts } from "@/lib/interest/site-texts";

type Props = { params: Promise<{ locale: string }> };

// Pagina di conferma uguale per email nuova, già registrata o oltre il limite di invio:
// non deve mai rivelare se l'indirizzo era già noto. Non va indicizzata.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// I testi vengono da site_texts (modificabili dal pannello): letti a ogni richiesta, non fissati alla build.
export const dynamic = "force-dynamic";

export default async function InterestConfirmPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [messages, texts] = await Promise.all([
    getMessages({ locale }),
    getSiteTexts(locale, ["interest.success", "interest.files.note"]),
  ]);
  const m = messages.interestForm as unknown as InterestFormMessages;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{m.confirmTitle}</h1>
      <p role="status" className="mt-4 text-lg text-zinc-800">
        {texts["interest.success"] ?? m.confirmSuccess}
      </p>
      <p className="mt-3 text-zinc-700">{texts["interest.files.note"] ?? m.confirmFilesNote}</p>
      <p className="mt-8">
        <Link href="/" className="underline underline-offset-2">
          {m.confirmBack}
        </Link>
      </p>
    </div>
  );
}
