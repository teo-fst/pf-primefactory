"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import type itMessages from "../../../messages/it.json";
import { registerUploadedFile } from "@/app/[locale]/area-clienti/[codice]/actions";
import { buttonVariants } from "@/components/ui/button";
import {
  ALLOWED_EXTENSIONS,
  STORAGE_BUCKET,
  buildStoragePath,
  formatBytes,
  randomUuid,
  validateFile,
} from "@/lib/account/files";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { uploadObject } from "./upload-xhr";

export type AccountMessages = (typeof itMessages)["account"];

type Item = {
  id: string;
  name: string;
  size: number;
  state: "uploading" | "done" | "error";
  progress: number;
  error?: string;
};

export function UploadForm({
  requestId,
  maxBytes,
  locale,
  messages: m,
}: {
  requestId: string;
  maxBytes: number;
  locale: string;
  messages: AccountMessages;
}) {
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const errors = m.uploadErrors as Record<string, string>;

  const patch = (id: string, change: Partial<Item>) =>
    setItems((list) => list.map((item) => (item.id === id ? { ...item, ...change } : item)));

  async function handleFiles(files: File[]) {
    if (files.length === 0 || busy) return;
    setBusy(true);
    const batch: Item[] = files.map((f) => ({
      id: randomUuid(),
      name: f.name,
      size: f.size,
      state: "uploading",
      progress: 0,
    }));
    setItems(batch);

    const supabase = createClient();
    const supabaseUrl = publicEnv.supabaseUrl() ?? "";
    const publishableKey = publicEnv.supabasePublishableKey() ?? "";

    const uploadOne = async (file: File, item: Item) => {
      const check = validateFile(file, maxBytes);
      if (!check.ok) {
        patch(item.id, { state: "error", error: errors[check.reason] });
        return;
      }
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        patch(item.id, { state: "error", error: errors.auth });
        return;
      }

      const path = buildStoragePath(requestId, randomUuid(), file.name);
      const uploaded = await uploadObject({
        supabaseUrl,
        publishableKey,
        accessToken: token,
        bucket: STORAGE_BUCKET,
        path,
        file,
        onProgress: (fraction) => patch(item.id, { progress: fraction }),
      });
      if (!uploaded.ok) {
        patch(item.id, { state: "error", error: errors[uploaded.code] });
        return;
      }

      // Registrazione lato server: ricontrolla proprietà, estensione, dimensione ed esistenza dell'oggetto.
      const registered = await registerUploadedFile({
        requestId,
        path,
        name: file.name,
        size: file.size,
        mimeType: file.type,
      }).catch(() => null);
      if (registered?.ok) patch(item.id, { state: "done", progress: 1 });
      else patch(item.id, { state: "error", error: errors[registered?.code ?? "register"] ?? errors.register });
    };

    for (const [index, file] of files.entries()) {
      // Un errore imprevisto su un file non deve bloccare gli altri né lasciare il form occupato.
      await uploadOne(file, batch[index]).catch(() => patch(batch[index].id, { state: "error", error: errors.network }));
    }

    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  const hint = m.uploadHint
    .replace("{extensions}", ALLOWED_EXTENSIONS.join(", "))
    .replace("{max}", formatBytes(maxBytes, locale));

  return (
    <div data-testid="upload-form">
      <p className="mb-3 text-sm text-zinc-600">{hint}</p>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        disabled={busy}
        accept={ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",")}
        className="sr-only"
        data-testid="upload-input"
        onChange={(e) => void handleFiles(Array.from(e.target.files ?? []))}
      />
      <label
        htmlFor={inputId}
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "cursor-pointer focus-within:ring-2",
          busy && "pointer-events-none opacity-50",
        )}
      >
        {m.uploadChoose}
      </label>

      {items.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-3" aria-live="polite" data-testid="upload-list">
          {items.map((item) => (
            <li key={item.id} className="text-sm" data-state={item.state}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="break-all font-medium">{item.name}</span>
                <span className="text-zinc-600">
                  {item.state === "uploading"
                    ? `${m.uploadStatusUploading} ${Math.round(item.progress * 100)}%`
                    : item.state === "done"
                      ? m.uploadStatusDone
                      : m.uploadStatusError}
                </span>
              </div>
              <progress
                className="mt-1 h-2 w-full"
                value={item.state === "error" ? 0 : item.progress}
                max={1}
                aria-label={item.name}
              />
              {item.error ? (
                <p role="alert" className="mt-1 text-red-700">
                  {item.error}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
