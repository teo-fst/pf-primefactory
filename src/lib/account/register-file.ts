import { cleanMimeType, isUuid, isValidStoragePath, storageFileName, validateFile } from "./files";

// Registrazione di un file già caricato nello Storage dal browser.
// La logica non conosce Supabase: riceve le operazioni come dipendenze, così si prova con dei mock.
// Il flusso è: richiesta del cliente? percorso corretto? estensione e dimensione ok? oggetto esistente?
// poi riga in `request_files` (RLS) e, se la richiesta è in stato `richiesta`, passa a `file_ricevuti`.

export type RegisterInput = { requestId: unknown; path: unknown; name: unknown; size: unknown; mimeType?: unknown };

export type RegisterErrorCode =
  | "invalid"
  | "extension"
  | "empty"
  | "too_large"
  | "not_found"
  | "missing_object"
  | "db";

export type RegisterResult = { ok: true; advanced: boolean } | { ok: false; code: RegisterErrorCode };

export type RegisterDeps = {
  userId: string;
  maxBytes: number;
  /** Richiesta della sessione corrente (letta con la RLS e filtrata per proprietario). */
  findOwnedRequest: (requestId: string) => Promise<{ id: string; status: string } | null>;
  /** Dimensione dell'oggetto nello Storage, o null se non esiste. */
  getObjectSize: (path: string) => Promise<number | null>;
  insertFile: (row: {
    request_id: string;
    storage_path: string;
    original_name: string;
    size_bytes: number;
    mime_type: string | null;
    uploaded_by: string;
  }) => Promise<boolean>;
  /** Porta la richiesta da `richiesta` a `file_ricevuti` (chiave segreta, solo dopo il controllo di proprietà). */
  advanceToFilesReceived: (requestId: string) => Promise<void>;
};

export async function processFileRegistration(input: RegisterInput, deps: RegisterDeps): Promise<RegisterResult> {
  const { requestId, path, name, size } = input;
  if (!isUuid(requestId) || typeof name !== "string" || name === "" || typeof size !== "number" || !Number.isInteger(size)) {
    return { ok: false, code: "invalid" };
  }
  if (!isValidStoragePath(path, requestId)) return { ok: false, code: "invalid" };

  const check = validateFile({ name, size }, deps.maxBytes);
  if (!check.ok) return { ok: false, code: check.reason };

  const request = await deps.findOwnedRequest(requestId);
  if (!request) return { ok: false, code: "not_found" };

  const stored = await deps.getObjectSize(path);
  if (stored === null || stored !== size) return { ok: false, code: "missing_object" };

  const inserted = await deps.insertFile({
    request_id: requestId,
    storage_path: path,
    original_name: name.split(/[\\/]/).pop()!.slice(0, 255) || storageFileName(path),
    size_bytes: size,
    mime_type: cleanMimeType(input.mimeType),
    uploaded_by: deps.userId,
  });
  if (!inserted) return { ok: false, code: "db" };

  let advanced = false;
  if (request.status === "richiesta") {
    try {
      await deps.advanceToFilesReceived(requestId);
      advanced = true;
    } catch {
      console.error("[area-clienti] passaggio a file_ricevuti non riuscito");
    }
  }
  return { ok: true, advanced };
}
