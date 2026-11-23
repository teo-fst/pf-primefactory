import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import type { AccountMessages } from "@/components/account/upload-form";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Pagina pubblica di conferma dopo "Elimina il mio account" (Q38): la sessione è già chiusa.
export default async function AccountDeletedPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const m = (await getMessages({ locale })).account as unknown as AccountMessages;

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{m.deletedTitle}</h1>
      <p role="status" className="mt-4 text-zinc-700" data-testid="account-deleted">
        {m.deletedText}
      </p>
      <p className="mt-6">
        <Link href="/" className="underline underline-offset-2">
          {m.deletedHome}
        </Link>
      </p>
    </div>
  );
}
