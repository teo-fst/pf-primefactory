"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/components/admin/use-hydrated";
import { Field, inputClass } from "@/components/interest/field";
import type { ActionState } from "@/lib/admin/action-state";
import type { AdminMessages } from "@/lib/admin/messages";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Caricamento foto del portfolio (Q16). La foto va dal browser dell'admin a Supabase Storage
// (bucket pubblico `portfolio`, scrittura ammessa solo agli admin dalla policy di Storage): non passa
// dal server dell'app, quindi nessun limite di dimensione delle Server Action. Il bucket rifiuta
// comunque tipi diversi da jpeg/png/webp/avif e file sopra 10 MB; i controlli qui servono a dirlo subito.

const MAX_BYTES = 10 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/**
 * Nome casuale in formato UUID v4. Non si usa crypto.randomUUID(): esiste solo nei contesti sicuri
 * (https o localhost) e il pannello va usato anche da un indirizzo di rete interno in http.
 */
function randomUuid(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

type Props = {
  lines: { id: number; name: string }[];
  messages: AdminMessages["portfolio"];
  createItem: (previous: ActionState, form: FormData) => Promise<ActionState>;
};

export function PortfolioUpload({ lines, messages: m, createItem }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [result, setResult] = useState<ActionState>({ status: "idle" });
  const [pending, startTransition] = useTransition();
  // Segnala che il modulo è pronto (JavaScript attivo): i test aspettano questo prima di cliccare.
  const hydrated = useHydrated();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");

    if (!(file instanceof File) || file.size === 0) return setResult({ status: "error", message: m.fileRequired });
    const extension = EXTENSIONS[file.type];
    if (!extension) return setResult({ status: "error", message: m.fileType });
    if (file.size > MAX_BYTES) return setResult({ status: "error", message: m.fileSize });
    if (data.get("published") === "on" && data.get("rights_transferred") !== "on") {
      return setResult({ status: "error", message: m.rightsRequired });
    }

    startTransition(async () => {
      try {
        const path = `${randomUuid()}.${extension}`;
        const supabase = createClient();
        const { error } = await supabase.storage
          .from("portfolio")
          .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
        if (error) return setResult({ status: "error", message: m.uploadFailed });

        const payload = new FormData();
        payload.set("image_path", path);
        for (const name of ["line_id", "caption_it", "caption_en", "rights_transferred", "published"]) {
          const value = data.get(name);
          if (typeof value === "string") payload.set(name, value);
        }
        const outcome = await createItem({ status: "idle" }, payload);
        if (outcome.status === "error") {
          // La riga non è stata creata: toglie la foto appena caricata per non lasciare file orfani.
          await supabase.storage.from("portfolio").remove([path]);
        } else {
          form.reset();
        }
        setResult(outcome);
      } catch {
        setResult({ status: "error", message: m.uploadFailed });
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="flex flex-col gap-4"
      data-testid="portfolio-upload"
      data-client-form="true"
      data-hydrated={hydrated ? "true" : undefined}
    >
      <Field id="pf-file" label={m.file} hint={m.fileHint}>
        <input id="pf-file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="pf-line" label={m.line}>
          <select id="pf-line" name="line_id" defaultValue="" className={inputClass}>
            <option value="">{m.noLine}</option>
            {lines.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
        <Field id="pf-caption-it" label={m.captionIt}>
          <input id="pf-caption-it" name="caption_it" maxLength={300} className={inputClass} />
        </Field>
        <Field id="pf-caption-en" label={m.captionEn}>
          <input id="pf-caption-en" name="caption_en" maxLength={300} className={inputClass} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="rights_transferred" /> {m.rights}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="published" /> {m.publishNow}
        </label>
      </div>
      <p className="text-xs text-zinc-500">{m.rightsHint}</p>
      <div>
        <Button type="submit" disabled={pending} className="min-h-9">
          {pending ? m.uploading : m.upload}
        </Button>
      </div>
      {result.status !== "idle" ? (
        <p
          role={result.status === "error" ? "alert" : "status"}
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            result.status === "error" ? "border-red-300 bg-red-50 text-red-800" : "border-green-300 bg-green-50 text-green-900",
          )}
        >
          {result.message}
        </p>
      ) : null}
    </form>
  );
}
