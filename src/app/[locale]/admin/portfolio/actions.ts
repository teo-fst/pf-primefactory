"use server";

import { z } from "zod";
import type { ActionState } from "@/lib/admin/action-state";
import { adminActionStart, dbErrorText, fail, field, flag, ok, refreshAdmin } from "@/lib/admin/action-helpers";
import { classifyDbError } from "@/lib/admin/db-errors";
import { invalidateCache, portfolioImageUrl } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";

// Portfolio (Q16). Le foto arrivano nel bucket pubblico `portfolio` direttamente dal browser dell'admin
// (la policy di Storage ammette solo admin): qui si crea/aggiorna/elimina la RIGA. Il divieto di
// pubblicare senza "diritti ceduti" è un vincolo del database (portfolio_rights_before_publish):
// se scatta, l'errore viene spiegato all'admin.

// Nomi generati dal browser: <uuid>.<estensione>. Niente cartelle, niente nomi liberi.
const IMAGE_PATH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|avif)$/;

const itemSchema = z.object({
  lineId: z.union([z.literal(""), z.string().regex(/^\d{1,5}$/)]),
  captionIt: z.string().max(300),
  captionEn: z.string().max(300),
  sort: z.string().regex(/^-?\d{1,6}$/),
});

function parseItem(form: FormData) {
  return itemSchema.safeParse({
    lineId: field(form, "line_id"),
    captionIt: field(form, "caption_it"),
    captionEn: field(form, "caption_en"),
    sort: field(form, "sort") || "0",
  });
}

/** L'immagine deve esistere davvero nel bucket pubblico prima di creare la riga. */
async function imageExists(path: string): Promise<boolean> {
  const url = portfolioImageUrl(path);
  if (!url) return false;
  try {
    const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(8000) });
    return response.ok;
  } catch {
    return false;
  }
}

export async function createPortfolioItem(_previous: ActionState, form: FormData): Promise<ActionState> {
  const start = await adminActionStart();
  if (!start.ok) return start.state;
  const { m, userId } = start;

  const path = field(form, "image_path");
  const parsed = parseItem(form);
  if (!IMAGE_PATH.test(path) || !parsed.success) return fail(m.errors.invalid);
  if (!(await imageExists(path))) return fail(m.portfolio.imageMissing);

  const supabase = await createClient();
  const { error } = await supabase.from("portfolio_items").insert({
    image_path: path,
    business_line_id: parsed.data.lineId === "" ? null : Number(parsed.data.lineId),
    caption_it: parsed.data.captionIt,
    caption_en: parsed.data.captionEn,
    sort: Number(parsed.data.sort),
    rights_transferred: flag(form, "rights_transferred"),
    published: flag(form, "published"),
    created_by: userId,
  });
  if (error) return fail(dbErrorText(m, error));

  await invalidateCache("portfolio:");
  refreshAdmin();
  return ok(m.portfolio.created);
}

export async function updatePortfolioItem(_previous: ActionState, form: FormData): Promise<ActionState> {
  const start = await adminActionStart();
  if (!start.ok) return start.state;
  const { m } = start;

  const id = field(form, "id");
  const parsed = parseItem(form);
  if (!/^\d{1,18}$/.test(id) || !parsed.success) return fail(m.errors.invalid);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portfolio_items")
    .update({
      business_line_id: parsed.data.lineId === "" ? null : Number(parsed.data.lineId),
      caption_it: parsed.data.captionIt,
      caption_en: parsed.data.captionEn,
      sort: Number(parsed.data.sort),
      rights_transferred: flag(form, "rights_transferred"),
      published: flag(form, "published"),
    })
    .eq("id", Number(id))
    .select("id");
  if (error) return fail(dbErrorText(m, error));
  if (!data || data.length === 0) return fail(m.errors.not_found);

  await invalidateCache("portfolio:");
  refreshAdmin();
  return ok(m.portfolio.saved);
}

export async function deletePortfolioItem(_previous: ActionState, form: FormData): Promise<ActionState> {
  const start = await adminActionStart();
  if (!start.ok) return start.state;
  const { m } = start;

  const id = field(form, "id");
  if (!/^\d{1,18}$/.test(id)) return fail(m.errors.invalid);

  const supabase = await createClient();
  const { data: item } = await supabase.from("portfolio_items").select("image_path").eq("id", Number(id)).maybeSingle();
  if (!item) return fail(m.errors.not_found);

  // Prima la riga (così la foto sparisce subito dal sito), poi il file.
  const { error } = await supabase.from("portfolio_items").delete().eq("id", Number(id));
  if (error) return fail(classifyDbError(error) === "forbidden" ? m.errors.forbidden : m.errors.unknown);

  const { error: storageError } = await supabase.storage.from("portfolio").remove([item.image_path]);
  if (storageError) console.warn("[admin] file del portfolio non eliminato dallo Storage");

  await invalidateCache("portfolio:");
  refreshAdmin();
  return ok(m.portfolio.deleted);
}
