"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type itMessages from "../../../messages/it.json";
import { submitInterest } from "@/app/[locale]/lista-interesse/actions";
import type { InterestFormState } from "@/app/[locale]/lista-interesse/state";
import { Button } from "@/components/ui/button";
import { TurnstileWidget } from "@/components/security/turnstile-widget";
import { Link } from "@/i18n/navigation";
import { fieldLabel, optionLabel, type FormField } from "@/lib/interest/form-schema";
import { Field, describedBy, inputClass } from "./field";

export type InterestFormMessages = (typeof itMessages)["interestForm"];

export type FormLine = { slug: string; name: string; fields: FormField[] };

type Props = {
  locale: string;
  quoteMode: boolean;
  lines: FormLine[];
  initialLine: string;
  source: string | null;
  turnstileSiteKey: string | null;
  messages: InterestFormMessages;
};

const IDLE: InterestFormState = { status: "idle" };

export function InterestForm({ locale, quoteMode, lines, initialLine, source, turnstileSiteKey, messages: m }: Props) {
  const [state, formAction, pending] = useActionState(submitInterest, IDLE);
  const values = state.status === "idle" ? {} : state.values;
  const errors = state.status === "invalid" ? state.errors : {};
  const [lineSlug, setLineSlug] = useState(values.line ?? initialLine);
  const summary = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status !== "idle") summary.current?.focus();
  }, [state]);

  const errorText = (name: string): string | undefined => {
    const code = errors[name];
    return code ? (m.errors as Record<string, string>)[code] : undefined;
  };

  const currentLine = lines.find((l) => l.slug === lineSlug);
  const formError = state.status === "error" ? (m.formErrors as Record<string, string>)[state.code] : undefined;
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-8" data-testid="interest-form">
      <div ref={summary} tabIndex={-1} className="outline-none">
        {hasErrors ? (
          <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            {m.errorSummary}
          </p>
        ) : null}
        {formError ? (
          <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            {formError}
          </p>
        ) : null}
      </div>

      <input type="hidden" name="locale" value={locale} />
      {source ? <input type="hidden" name="fonte" value={source} /> : null}

      {/* Campo trappola per i bot: fuori schermo, ignorato da tastiera e screen reader. Se compilato la richiesta viene scartata. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company_website">Website</label>
        <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-base font-semibold">{m.legendContact}</legend>
        <Field id="name" label={m.name} error={errorText("name")}>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            defaultValue={values.name}
            className={inputClass}
            {...describedBy("name", false, !!errorText("name"))}
          />
        </Field>
        <Field id="email" label={m.email} error={errorText("email")}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={values.email}
            className={inputClass}
            {...describedBy("email", false, !!errorText("email"))}
          />
        </Field>
        <Field id="phone" label={m.phone} optional={m.optional} error={errorText("phone")}>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            defaultValue={values.phone}
            className={inputClass}
            {...describedBy("phone", false, !!errorText("phone"))}
          />
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-base font-semibold">{m.legendRequest}</legend>
        <Field id="line" label={m.line} error={errorText("line")}>
          <select
            id="line"
            name="line"
            required
            value={lineSlug}
            onChange={(e) => setLineSlug(e.target.value)}
            className={inputClass}
            {...describedBy("line", false, !!errorText("line"))}
          >
            <option value="">{m.linePlaceholder}</option>
            {lines.map((line) => (
              <option key={line.slug} value={line.slug}>
                {line.name}
              </option>
            ))}
          </select>
        </Field>

        {currentLine && currentLine.fields.length > 0 ? (
          <fieldset key={currentLine.slug} className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4" data-testid="dynamic-fields">
            <legend className="px-1 text-sm font-medium text-zinc-700">{m.legendDetails}</legend>
            {currentLine.fields.map((field) => (
              <DynamicField
                key={field.key}
                field={field}
                locale={locale}
                optionalLabel={m.optional}
                yesLabel={m.yes}
                selectLabel={m.select}
                defaultValue={values[`details.${field.key}`]}
                error={errorText(`details.${field.key}`)}
              />
            ))}
          </fieldset>
        ) : null}

        <Field
          id="description"
          label={m.description}
          hint={m.descriptionHint}
          error={errorText("description")}
        >
          <textarea
            id="description"
            name="description"
            rows={5}
            required
            minLength={10}
            maxLength={5000}
            defaultValue={values.description}
            className={inputClass}
            {...describedBy("description", true, !!errorText("description"))}
          />
        </Field>
        <Field id="measures" label={m.measures} optional={m.optional} hint={m.measuresHint} error={errorText("measures")}>
          <input
            id="measures"
            name="measures"
            type="text"
            maxLength={2000}
            defaultValue={values.measures}
            className={inputClass}
            {...describedBy("measures", true, !!errorText("measures"))}
          />
        </Field>
        <Field id="deadline" label={m.deadline} optional={m.optional} error={errorText("deadline")}>
          <input
            id="deadline"
            name="deadline"
            type="date"
            defaultValue={values.deadline}
            className={inputClass}
            {...describedBy("deadline", false, !!errorText("deadline"))}
          />
        </Field>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-start gap-2">
          <input
            id="consent"
            name="consent"
            type="checkbox"
            required
            defaultChecked={values.consent === "on"}
            className="mt-1 size-4"
            {...describedBy("consent", false, !!errorText("consent"))}
          />
          <label htmlFor="consent" className="text-sm text-zinc-800">
            {m.consentBefore}
            <Link href="/legale/privacy" target="_blank" rel="noopener" className="underline underline-offset-2">
              {m.consentLink}
            </Link>
            {m.consentAfter}
          </label>
        </div>
        {errorText("consent") ? (
          <p id="consent-error" role="alert" className="text-xs font-medium text-red-700">
            {errorText("consent")}
          </p>
        ) : null}
      </div>

      {turnstileSiteKey ? <TurnstileWidget siteKey={turnstileSiteKey} locale={locale} resetSignal={state} /> : null}

      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? m.submitting : quoteMode ? m.submitQuote : m.submitInterest}
        </Button>
      </div>
    </form>
  );
}

function DynamicField({
  field,
  locale,
  optionalLabel,
  yesLabel,
  selectLabel,
  defaultValue,
  error,
}: {
  field: FormField;
  locale: string;
  optionalLabel: string;
  yesLabel: string;
  selectLabel: string;
  defaultValue: string | undefined;
  error: string | undefined;
}) {
  const id = `details-${field.key}`;
  const name = `details.${field.key}`;
  const label = fieldLabel(field, locale);
  const aria = describedBy(id, false, !!error);

  if (field.type === "boolean") {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <input
            id={id}
            name={name}
            type="checkbox"
            defaultChecked={defaultValue === "on"}
            className="size-4"
            {...aria}
          />
          <label htmlFor={id} className="text-sm text-zinc-800">
            {label} <span className="sr-only">({yesLabel})</span>
          </label>
        </div>
        {error ? (
          <p id={`${id}-error`} role="alert" className="text-xs font-medium text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <Field id={id} label={label} optional={field.required ? undefined : optionalLabel} error={error}>
      {field.type === "select" ? (
        <select id={id} name={name} required={field.required} defaultValue={defaultValue ?? ""} className={inputClass} {...aria}>
          <option value="">{selectLabel}</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {optionLabel(o, locale)}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={name}
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          inputMode={field.type === "number" ? "decimal" : undefined}
          step={field.type === "number" ? "any" : undefined}
          maxLength={field.type === "text" ? 500 : undefined}
          required={field.required}
          defaultValue={defaultValue}
          className={inputClass}
          {...aria}
        />
      )}
    </Field>
  );
}
