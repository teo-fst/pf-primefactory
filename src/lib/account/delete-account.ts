// Eliminazione dell'account (Q38). L'ordine conta: prima i file nello Storage (che la cascata del
// database non tocca), poi l'utente. Se la pulizia dello Storage fallisce ci si ferma senza
// cancellare l'utente, così non restano file orfani che nessuno potrebbe più eliminare.

export type DeleteAccountResult =
  | { status: "deleted" }
  | { status: "error"; code: "confirmation" | "storage" | "delete" };

export type DeleteAccountDeps = {
  /** Id delle richieste dell'utente. */
  listRequestIds: (userId: string) => Promise<string[]>;
  /** Tutti i percorsi sotto `<request_id>/` nello Storage (registrati nel DB o no). */
  listStoragePaths: (requestId: string) => Promise<string[]>;
  removeStoragePaths: (paths: string[]) => Promise<void>;
  deleteAuthUser: (userId: string) => Promise<void>;
};

export function emailMatches(confirmation: unknown, userEmail: string | null): boolean {
  if (typeof confirmation !== "string" || !userEmail) return false;
  return confirmation.trim().toLowerCase() === userEmail.trim().toLowerCase();
}

/** `userId` e `userEmail` vengono SEMPRE dalla sessione verificata, mai dal form. */
export async function processAccountDeletion(
  input: { userId: string; userEmail: string | null; confirmation: unknown },
  deps: DeleteAccountDeps,
): Promise<DeleteAccountResult> {
  if (!emailMatches(input.confirmation, input.userEmail)) return { status: "error", code: "confirmation" };

  try {
    const requestIds = await deps.listRequestIds(input.userId);
    const paths: string[] = [];
    for (const id of requestIds) paths.push(...(await deps.listStoragePaths(id)));
    if (paths.length > 0) await deps.removeStoragePaths(paths);
  } catch {
    console.error("[account] pulizia dello Storage non riuscita: account NON eliminato");
    return { status: "error", code: "storage" };
  }

  try {
    await deps.deleteAuthUser(input.userId);
  } catch {
    console.error("[account] eliminazione utente non riuscita");
    return { status: "error", code: "delete" };
  }
  return { status: "deleted" };
}
