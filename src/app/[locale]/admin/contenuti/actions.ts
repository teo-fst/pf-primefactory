"use server";

import { z } from "zod";
import type { ActionState } from "@/lib/admin/action-state";
import { adminActionStart, dbErrorText, fail, field, flag, ok, refreshAdmin } from "@/lib/admin/action-helpers";
import { parseFormSchemaText } from "@/lib/admin/form-schema-editor";
import { invalidateCache } from "@/lib/content";
import { fallbackTexts } from "@/lib/content/texts";
import { createClient } from "@/lib/supabase/server";

// Contenuti del sito: testi (Q33), visibilità di pagine e linee (Q2, Q34), modulo per linea (Q43),
// interruttore lista d'interesse / preventivo (Q8). Dopo OGNI modifica si svuota la cache dei
// contenuti pubblici (Upstash): senza, il sito mostrerebbe il vecchio valore fino a 5 minuti.

const VISIBILITY = ["attiva", "in_sviluppo", "oscurata"] as const;

// ---------- testi ----------

const textKey = z.string().regex(/^[a-z0-9_.-]{1,120}$/);

export async function saveSiteText(_previous: ActionState, form: FormData): Promise<ActionState> {
  const start = await adminActionStart();
  if (!start.ok) return start.state;
  const { m } = start;

  const key = textKey.safeParse(field(form, "key"));
  const valueIt = form.get("value_it");
  const valueEn = form.get("value_en");
  if (!key.success || typeof valueIt !== "string" || typeof valueEn !== "string") return fail(m.errors.invalid);
  const it = valueIt.trim();
  const en = valueEn.trim();
  if (it === "") return fail(m.content.textItRequired);
  if (it.length > 5000 || en.length > 5000) return fail(m.errors.too_long);

  const supabase = await createClient();
  // Si possono modificare solo testi che esistono già (nel file di riserva o nel database).
  const known = key.data in fallbackTexts("it");
  if (!known) {
    const { count } = await supabase.from("site_texts").select("key", { count: "exact", head: true }).eq("key", key.data);
    if (!count) return fail(m.content.textUnknown);
  }

  const { error } = await supabase.from("site_texts").upsert({ key: key.data, locale: "it", value: it }, { onConflict: "key,locale" });
  if (error) return fail(dbErrorText(m, error));

  // Inglese vuoto = nessuna traduzione: il sito ricade sull'italiano.
  if (en === "") {
    const { error: delError } = await supabase.from("site_texts").delete().eq("key", key.data).eq("locale", "en");
    if (delError) return fail(dbErrorText(m, delError));
  } else {
    const { error: enError } = await supabase.from("site_texts").upsert({ key: key.data, locale: "en", value: en }, { onConflict: "key,locale" });
    if (enError) return fail(dbErrorText(m, enError));
  }

  await invalidateCache("texts:");
  refreshAdmin();
  return ok(m.content.textSaved);
}

/** Toglie le modifiche e ripristina il testo predefinito (file content/site-texts.json). */
export async function resetSiteText(_previous: ActionState, form: FormData): Promise<ActionState> {
  const start = await adminActionStart();
  if (!start.ok) return start.state;
  const { m } = start;

  const key = textKey.safeParse(field(form, "key"));
  if (!key.success || !(key.data in fallbackTexts("it"))) return fail(m.errors.invalid);

  const supabase = await createClient();
  const { error } = await supabase.from("site_texts").delete().eq("key", key.data);
  if (error) return fail(dbErrorText(m, error));

  await invalidateCache("texts:");
  refreshAdmin();
  return ok(m.content.textReset);
}

// ---------- visibilità ----------

export async function setPageVisibility(_previous: ActionState, form: FormData): Promise<ActionState> {
  const start = await adminActionStart();
  if (!start.ok) return start.state;
  const { m } = start;

  const slug = z.string().regex(/^[a-z0-9-]{1,60}$/).safeParse(field(form, "slug"));
  const visibility = z.enum(VISIBILITY).safeParse(field(form, "visibility"));
  if (!slug.success || !visibility.success) return fail(m.errors.invalid);

  const supabase = await createClient();
  const { data, error } = await supabase.from("pages").update({ visibility: visibility.data }).eq("slug", slug.data).select("slug");
  if (error) return fail(dbErrorText(m, error));
  if (!data || data.length === 0) return fail(m.errors.not_found);

  await invalidateCache("pages:");
  refreshAdmin();
  return ok(m.content.saved);
}

export async function setLineSettings(_previous: ActionState, form: FormData): Promise<ActionState> {
  const start = await adminActionStart();
  if (!start.ok) return start.state;
  const { m } = start;

  const slug = z.string().regex(/^[a-z0-9-]{1,60}$/).safeParse(field(form, "slug"));
  const visibility = z.enum(VISIBILITY).safeParse(field(form, "visibility"));
  if (!slug.success || !visibility.success) return fail(m.errors.invalid);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_lines")
    .update({ visibility: visibility.data, accepts_requests: flag(form, "accepts_requests") })
    .eq("slug", slug.data)
    .select("slug");
  if (error) return fail(dbErrorText(m, error));
  if (!data || data.length === 0) return fail(m.errors.not_found);

  await invalidateCache("lines:");
  refreshAdmin();
  return ok(m.content.saved);
}

/** Interruttore unico lista d'interesse ↔ preventivi (Q8). Lo stato lo decide il server dal valore attuale. */
export async function setQuoteMode(_previous: ActionState, form: FormData): Promise<ActionState> {
  const start = await adminActionStart();
  if (!start.ok) return start.state;
  const { m } = start;

  const target = field(form, "enabled");
  if (target !== "true" && target !== "false") return fail(m.errors.invalid);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_settings")
    .update({ value: target === "true" })
    .eq("key", "quote_mode")
    .select("key");
  if (error) return fail(dbErrorText(m, error));
  if (!data || data.length === 0) return fail(m.errors.not_found);

  // Il modulo pubblico legge quote_mode direttamente dal database, senza cache: nulla da invalidare.
  // (Non si svuota "tutto": su Upstash stanno anche i contatori anti-spam.)
  refreshAdmin();
  return ok(target === "true" ? m.content.quoteOn : m.content.quoteOff);
}

// ---------- modulo per linea ----------

export async function saveFormSchema(_previous: ActionState, form: FormData): Promise<ActionState> {
  const start = await adminActionStart();
  if (!start.ok) return start.state;
  const { m } = start;

  const slug = z.string().regex(/^[a-z0-9-]{1,60}$/).safeParse(field(form, "slug"));
  const raw = form.get("schema");
  if (!slug.success || typeof raw !== "string" || raw.length > 100_000) return fail(m.errors.invalid);

  // Validazione stretta PRIMA di salvare: una schema sbagliata non arriva mai al database.
  const result = parseFormSchemaText(raw);
  if (!result.ok) return fail(m.content.schemaInvalid.replace("{count}", String(result.issues.length)));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_lines")
    .update({ form_schema: result.schema })
    .eq("slug", slug.data)
    .select("slug");
  if (error) return fail(dbErrorText(m, error));
  if (!data || data.length === 0) return fail(m.errors.not_found);

  await invalidateCache("lines:");
  refreshAdmin();
  return ok(m.content.schemaSaved);
}
