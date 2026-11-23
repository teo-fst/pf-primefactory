"use client";

import { useRef } from "react";
import { ActionForm, SubmitButton, type AdminAction } from "@/components/admin/action-form";
import { Field, inputClass } from "@/components/interest/field";
import type { AdminMessages } from "@/lib/admin/messages";
import { slugifySourceCode } from "@/lib/admin/source-code";
import type { Tables } from "@/lib/supabase/database.types";

type Props = {
  action: AdminAction;
  locale: string;
  messages: AdminMessages["events"];
  event?: Tables<"events">;
};

const KINDS = ["trackday", "motoraduno", "fiera", "altro"] as const;

/**
 * Modulo evento (nuovo o modifica). Il codice fonte si propone dal titolo finché l'admin
 * non lo modifica a mano; resta sempre modificabile.
 */
export function EventForm({ action, locale, messages: m, event }: Props) {
  const sourceRef = useRef<HTMLInputElement>(null);
  const touched = useRef(Boolean(event));

  return (
    <ActionForm action={action} className="flex flex-col gap-4" testId="event-form">
      <input type="hidden" name="locale" value={locale} />
      {event ? <input type="hidden" name="id" value={event.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ev-title-it" label={m.titleIt}>
          <input
            id="ev-title-it"
            name="title_it"
            required
            maxLength={200}
            defaultValue={event?.title_it}
            className={inputClass}
            onInput={(e) => {
              if (!touched.current && sourceRef.current) sourceRef.current.value = slugifySourceCode(e.currentTarget.value);
            }}
          />
        </Field>
        <Field id="ev-title-en" label={m.titleEn} hint={m.titleEnHint}>
          <input id="ev-title-en" name="title_en" maxLength={200} defaultValue={event?.title_en} className={inputClass} />
        </Field>
        <Field id="ev-desc-it" label={m.descriptionIt}>
          <textarea id="ev-desc-it" name="description_it" rows={3} maxLength={5000} defaultValue={event?.description_it} className={inputClass} />
        </Field>
        <Field id="ev-desc-en" label={m.descriptionEn}>
          <textarea id="ev-desc-en" name="description_en" rows={3} maxLength={5000} defaultValue={event?.description_en} className={inputClass} />
        </Field>
        <Field id="ev-location" label={m.location}>
          <input id="ev-location" name="location" maxLength={200} defaultValue={event?.location} className={inputClass} />
        </Field>
        <Field id="ev-kind" label={m.kind}>
          <select key={event?.kind} id="ev-kind" name="kind" defaultValue={event?.kind ?? "trackday"} className={inputClass}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {m.kinds[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="ev-starts" label={m.startsOn}>
          <input id="ev-starts" name="starts_on" type="date" required defaultValue={event?.starts_on} className={inputClass} />
        </Field>
        <Field id="ev-ends" label={m.endsOn} hint={m.endsOnHint}>
          <input id="ev-ends" name="ends_on" type="date" defaultValue={event?.ends_on ?? ""} className={inputClass} />
        </Field>
      </div>

      <Field id="ev-source" label={m.sourceCode} hint={m.sourceCodeHint}>
        <input
          id="ev-source"
          name="source_code"
          ref={sourceRef}
          maxLength={80}
          pattern="[a-z0-9\-]*"
          defaultValue={event?.source_code}
          className={`${inputClass} font-mono`}
          onInput={() => {
            touched.current = true;
          }}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="published" defaultChecked={event?.published ?? false} /> {m.published}
      </label>

      <div>
        <SubmitButton>{event ? m.save : m.create}</SubmitButton>
      </div>
    </ActionForm>
  );
}
