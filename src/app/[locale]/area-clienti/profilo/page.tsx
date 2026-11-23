import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { DeleteAccountForm } from "@/components/account/delete-account-form";
import { ProfileForm } from "@/components/account/profile-form";
import type { AccountMessages } from "@/components/account/upload-form";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";

type Props = { params: Promise<{ locale: string }> };

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const { user, profile } = await requireUser(locale);
  const m = (await getMessages({ locale })).account as unknown as AccountMessages;

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
      <p className="mb-4 text-sm">
        <Link href="/area-clienti" className="underline underline-offset-2">
          ← {m.title}
        </Link>
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">{m.profileTitle}</h1>
      <p className="mt-3 mb-8 text-zinc-700">{m.profileIntro}</p>
      <ProfileForm
        email={user.email}
        initial={{ full_name: profile.full_name, phone: profile.phone, locale: profile.locale }}
        messages={m}
      />

      {user.email ? (
        <section aria-labelledby="sec-delete" className="mt-14 border-t border-zinc-300 pt-8">
          <h2 id="sec-delete" className="mb-3 text-xl font-semibold text-red-800">
            {m.deleteTitle}
          </h2>
          <p className="mb-5 text-sm text-zinc-700">{m.deleteWarning}</p>
          <DeleteAccountForm email={user.email} locale={locale} messages={m} />
        </section>
      ) : null}
    </div>
  );
}
