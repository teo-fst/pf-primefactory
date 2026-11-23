"use client";

import { useActionState, useEffect, useRef } from "react";
import type itMessages from "../../../messages/it.json";
import { requestMagicLink } from "@/app/[locale]/accedi/actions";
import { Field, describedBy, inputClass } from "@/components/interest/field";
import { TurnstileWidget } from "@/components/security/turnstile-widget";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { LoginState } from "@/lib/auth/login";

export type AuthMessages = (typeof itMessages)["auth"];

const IDLE: LoginState = { status: "idle" };

export function LoginForm({
  locale,
  turnstileSiteKey,
  messages: m,
  linkError,
}: {
  locale: string;
  turnstileSiteKey: string | null;
  messages: AuthMessages;
  linkError: boolean;
}) {
  const [state, formAction, pending] = useActionState(requestMagicLink, IDLE);
  const live = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status !== "idle") live.current?.focus();
  }, [state]);

  if (state.status === "sent") {
    return (
      <div ref={live} tabIndex={-1} role="status" className="rounded-lg border border-zinc-300 bg-zinc-50 p-4 text-zinc-800 outline-none" data-testid="login-sent">
        {m.sent}
      </div>
    );
  }

  const errors = m.errors as Record<string, string>;
  const fieldError = state.status === "invalid" ? errors[state.error] : undefined;
  const formError = state.status === "error" ? errors[state.code] : undefined;
  const email = state.status === "invalid" || state.status === "error" ? state.email : "";

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5" data-testid="login-form">
      <div ref={live} tabIndex={-1} className="outline-none">
        {linkError && state.status === "idle" ? (
          <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            {m.linkError}
          </p>
        ) : null}
        {formError ? (
          <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            {formError}
          </p>
        ) : null}
      </div>

      <input type="hidden" name="locale" value={locale} />
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company_website">Website</label>
        <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <Field id="login-email" label={m.email} error={fieldError}>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={email}
          className={inputClass}
          {...describedBy("login-email", false, !!fieldError)}
        />
      </Field>

      {turnstileSiteKey ? <TurnstileWidget siteKey={turnstileSiteKey} locale={locale} resetSignal={state} /> : null}

      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? m.sending : m.sendLink}
        </Button>
      </div>

      <p className="text-sm text-zinc-600">
        {m.noAccountBefore}
        <Link href="/lista-interesse" className="underline underline-offset-2">
          {m.noAccountLink}
        </Link>
        {m.noAccountAfter}
      </p>
    </form>
  );
}
