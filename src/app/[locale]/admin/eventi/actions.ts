"use server";

import { z } from "zod";
import type { ActionState } from "@/lib/admin/action-state";
import { adminActionStart, dbErrorText, fail, field, flag, refreshAdmin } from "@/lib/admin/action-helpers";
import { isValidSourceCode, slugifySourceCode, uniqueSourceCode } from "@/lib/admin/source-code";
import { invalidateCache } from "@/lib/content";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { isValidIsoDate } from "@/lib/interest/form-schema";
import { createClient } from "@/lib/supabase/server";

// Eventi (Q34, Q39). Il codice fonte (`source_code`) si genera dal titolo se l'admin non lo scrive,
// ed è unico: se esiste già si aggiunge -2, -3... Il database ha comunque un vincolo di unicità.

const KINDS = ["trackday", "motoraduno", "fiera", "altro"] as const;
const isoDate = z.string().refine(isValidIsoDate);

const eventSchema = z
  .object({
    titleIt: z.string().min(1).max(200),
    titleEn: z.string().max(200),
    descriptionIt: z.string().max(5000),
    descriptionEn: z.string().max(5000),
    location: z.string().max(200),
    kind: z.enum(KINDS),
    startsOn: isoDate,
    endsOn: z.union([z.literal(""), isoDate]),
    sourceCode: z.union([z.literal(""), z.string().refine(isValidSourceCode)]),
  })
  .refine((e) => e.endsOn === "" || e.endsOn >= e.startsOn, { path: ["endsOn"], message: "dates" });

function parseEvent(form: FormData) {
  return eventSchema.safeParse({
    titleIt: field(form, "title_it"),
    titleEn: field(form, "title_en"),
    descriptionIt: field(form, "description_it"),
    descriptionEn: field(form, "description_en"),
    location: field(form, "location"),
    kind: field(form, "kind"),
    startsOn: field(form, "starts_on"),
    endsOn: field(form, "ends_on"),
    sourceCode: field(form, "source_code").toLowerCase(),
  });
}

function localeOf(form: FormData) {
  const value = field(form, "locale");
  return (routing.locales as readonly string[]).includes(value) ? value : routing.defaultLocale;
}

export async function saveEvent(_previous: ActionState, form: FormData): Promise<ActionState> {
  const start = await adminActionStart();
  if (!start.ok) return start.state;
  const { m } = start;

  const rawId = field(form, "id");
  const id = rawId === "" ? null : /^\d{1,18}$/.test(rawId) ? Number(rawId) : NaN;
  const parsed = parseEvent(form);
  if (Number.isNaN(id) || !parsed.success) {
    const datesProblem = !parsed.success && parsed.error.issues.some((i) => i.path[0] === "endsOn");
    const sourceProblem = !parsed.success && parsed.error.issues.some((i) => i.path[0] === "sourceCode");
    return fail(datesProblem ? m.events.datesInvalid : sourceProblem ? m.events.sourceInvalid : m.events.invalid);
  }
  const data = parsed.data;

  const supabase = await createClient();

  let sourceCode = data.sourceCode;
  if (sourceCode === "") {
    const base = slugifySourceCode(data.titleIt);
    const { data: taken } = await supabase.from("events").select("id, source_code").like("source_code", `${base || "evento"}%`);
    sourceCode = uniqueSourceCode(
      base,
      (taken ?? []).filter((row) => row.id !== id).map((row) => row.source_code),
    );
  }

  const row = {
    title_it: data.titleIt,
    title_en: data.titleEn || data.titleIt,
    description_it: data.descriptionIt,
    description_en: data.descriptionEn,
    location: data.location,
    kind: data.kind,
    starts_on: data.startsOn,
    ends_on: data.endsOn === "" ? null : data.endsOn,
    source_code: sourceCode,
    published: flag(form, "published"),
  };

  if (id === null) {
    const { data: created, error } = await supabase.from("events").insert(row).select("id").single();
    if (error) return fail(error.code === "23505" ? m.events.sourceTaken : dbErrorText(m, error));
    await invalidateCache("events:");
    refreshAdmin();
    redirect({ href: `/admin/eventi/${created.id}`, locale: localeOf(form) });
  }

  const { data: updated, error } = await supabase.from("events").update(row).eq("id", id!).select("id");
  if (error) return fail(error.code === "23505" ? m.events.sourceTaken : dbErrorText(m, error));
  if (!updated || updated.length === 0) return fail(m.errors.not_found);

  await invalidateCache("events:");
  refreshAdmin();
  return { status: "ok", message: m.events.saved };
}

export async function deleteEvent(_previous: ActionState, form: FormData): Promise<ActionState> {
  const start = await adminActionStart();
  if (!start.ok) return start.state;
  const { m } = start;

  const id = field(form, "id");
  if (!/^\d{1,18}$/.test(id)) return fail(m.errors.invalid);

  const supabase = await createClient();
  const { data, error } = await supabase.from("events").delete().eq("id", Number(id)).select("id");
  if (error) return fail(dbErrorText(m, error));
  if (!data || data.length === 0) return fail(m.errors.not_found);

  await invalidateCache("events:");
  refreshAdmin();
  redirect({ href: "/admin/eventi", locale: localeOf(form) });
  return { status: "ok", message: m.events.deleted };
}
