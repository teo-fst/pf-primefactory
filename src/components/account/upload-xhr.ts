// Caricamento di un file direttamente su Supabase Storage dal browser, con avanzamento.
// supabase-js non espone il progresso di invio, quindi si usa XMLHttpRequest sull'endpoint standard
// dell'API Storage con il token della sessione dell'utente: le policy dello Storage decidono se il
// file può essere scritto (solo il proprietario della richiesta, nel bucket `request-files`).

export type UploadOutcome = { ok: true } | { ok: false; code: "auth" | "too_large" | "network" };

export function uploadObject(opts: {
  supabaseUrl: string;
  publishableKey: string;
  accessToken: string;
  bucket: string;
  path: string;
  file: File;
  onProgress: (fraction: number) => void;
}): Promise<UploadOutcome> {
  return new Promise((resolve) => {
    const encodedPath = opts.path.split("/").map(encodeURIComponent).join("/");
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${opts.supabaseUrl}/storage/v1/object/${opts.bucket}/${encodedPath}`);
    xhr.setRequestHeader("Authorization", `Bearer ${opts.accessToken}`);
    xhr.setRequestHeader("apikey", opts.publishableKey);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=3600");
    xhr.setRequestHeader("Content-Type", opts.file.type || "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) opts.onProgress(event.loaded / event.total);
    };
    xhr.onerror = () => resolve({ ok: false, code: "network" });
    xhr.onabort = () => resolve({ ok: false, code: "network" });
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve({ ok: true });
      else if (xhr.status === 401 || xhr.status === 403) resolve({ ok: false, code: "auth" });
      else if (xhr.status === 413) resolve({ ok: false, code: "too_large" });
      else resolve({ ok: false, code: "network" });
    };
    xhr.send(opts.file);
  });
}
