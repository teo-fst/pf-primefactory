import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { LoginForm, type AuthMessages } from "@/components/auth/login-form";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth/session";
import { getTurnstileSiteKey } from "@/lib/security/turnstile";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const m = (await getMessages({ locale })).auth as unknown as AuthMessages;
  return { title: m.loginTitle, robots: { index: false, follow: false } };
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Chi ha già una sessione valida va direttamente all'area clienti.
  if (await getCurrentUser()) redirect({ href: "/area-clienti", locale });

  const [messages, query] = await Promise.all([getMessages({ locale }), searchParams]);
  const m = messages.auth as unknown as AuthMessages;

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{m.loginTitle}</h1>
      <p className="mt-3 mb-8 text-zinc-700">{m.loginIntro}</p>
      <LoginForm
        locale={locale}
        turnstileSiteKey={getTurnstileSiteKey()}
        messages={m}
        linkError={query.errore === "link"}
      />
    </div>
  );
}
