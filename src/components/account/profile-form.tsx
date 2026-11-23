"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileState } from "@/app/[locale]/area-clienti/profilo/actions";
import { Field, describedBy, inputClass } from "@/components/interest/field";
import { Button } from "@/components/ui/button";
import type { AccountMessages } from "./upload-form";

const IDLE: ProfileState = { status: "idle" };

export function ProfileForm({
  email,
  initial,
  messages: m,
}: {
  email: string | null;
  initial: { full_name: string; phone: string | null; locale: string };
  messages: AccountMessages;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, IDLE);
  const errors = m.profileErrors as Record<string, string>;
  const fieldErrors = state.status === "invalid" ? state.errors : {};
  const formError = state.status === "error" ? errors[state.code] : undefined;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5" data-testid="profile-form">
      {formError ? (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {formError}
        </p>
      ) : null}

      <Field id="profile-email" label={m.profileEmail}>
        <input id="profile-email" type="email" value={email ?? ""} readOnly disabled className={inputClass} />
      </Field>

      <Field id="profile-name" label={m.fullName} error={fieldErrors.full_name && errors[fieldErrors.full_name]}>
        <input
          id="profile-name"
          name="full_name"
          type="text"
          autoComplete="name"
          required
          defaultValue={initial.full_name}
          className={inputClass}
          {...describedBy("profile-name", false, !!fieldErrors.full_name)}
        />
      </Field>

      <Field
        id="profile-phone"
        label={m.phone}
        optional={m.optional}
        error={fieldErrors.phone && errors[fieldErrors.phone]}
      >
        <input
          id="profile-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={initial.phone ?? ""}
          className={inputClass}
          {...describedBy("profile-phone", false, !!fieldErrors.phone)}
        />
      </Field>

      <Field id="profile-locale" label={m.language} error={fieldErrors.locale && errors[fieldErrors.locale]}>
        <select
          id="profile-locale"
          name="locale"
          defaultValue={initial.locale === "en" ? "en" : "it"}
          className={inputClass}
        >
          <option value="it">{m.langIt}</option>
          <option value="en">{m.langEn}</option>
        </select>
      </Field>

      <div className="flex items-center gap-4">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? m.saving : m.save}
        </Button>
        {state.status === "saved" ? (
          <p role="status" className="text-sm text-zinc-700" data-testid="profile-saved">
            {m.saved}
          </p>
        ) : null}
      </div>
    </form>
  );
}
