// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emailMatches, processAccountDeletion, type DeleteAccountDeps } from "@/lib/account/delete-account";

const USER = "00000000-0000-4000-8000-000000000001";

function setup(over: Partial<DeleteAccountDeps> = {}) {
  const calls: string[] = [];
  const deps: DeleteAccountDeps = {
    listRequestIds: vi.fn(async () => {
      calls.push("listRequestIds");
      return ["r1", "r2"];
    }),
    listStoragePaths: vi.fn(async (id: string) => {
      calls.push(`list:${id}`);
      return [`${id}/a.stl`, `${id}/b.pdf`];
    }),
    removeStoragePaths: vi.fn(async () => {
      calls.push("removeStorage");
    }),
    deleteAuthUser: vi.fn(async () => {
      calls.push("deleteUser");
    }),
    ...over,
  };
  return { deps, calls };
}
const ok = { userId: USER, userEmail: "mario@example.com", confirmation: "mario@example.com" };

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

describe("emailMatches", () => {
  it("ignora maiuscole e spazi", () => {
    expect(emailMatches("  MARIO@Example.com ", "mario@example.com")).toBe(true);
  });
  it("rifiuta diverso, vuoto, assente, non stringa", () => {
    expect(emailMatches("altro@example.com", "mario@example.com")).toBe(false);
    expect(emailMatches("", "mario@example.com")).toBe(false);
    expect(emailMatches("mario@example.com", null)).toBe(false);
    expect(emailMatches(undefined, "mario@example.com")).toBe(false);
    expect(emailMatches(["mario@example.com"], "mario@example.com")).toBe(false);
  });
});

describe("processAccountDeletion", () => {
  it("conferma corretta: prima i file dello Storage, poi l'utente", async () => {
    const { deps, calls } = setup();
    expect(await processAccountDeletion(ok, deps)).toEqual({ status: "deleted" });
    expect(calls).toEqual(["listRequestIds", "list:r1", "list:r2", "removeStorage", "deleteUser"]);
    expect(deps.removeStoragePaths).toHaveBeenCalledWith(["r1/a.stl", "r1/b.pdf", "r2/a.stl", "r2/b.pdf"]);
    expect(deps.deleteAuthUser).toHaveBeenCalledWith(USER);
  });

  it("conferma errata o mancante: non cancella NULLA e non legge nemmeno i dati", async () => {
    for (const confirmation of ["altro@example.com", "", null, undefined]) {
      const { deps } = setup();
      expect(await processAccountDeletion({ ...ok, confirmation }, deps)).toEqual({
        status: "error",
        code: "confirmation",
      });
      expect(deps.listRequestIds).not.toHaveBeenCalled();
      expect(deps.removeStoragePaths).not.toHaveBeenCalled();
      expect(deps.deleteAuthUser).not.toHaveBeenCalled();
    }
  });

  it("l'email di confronto è quella della sessione, non quella digitata altrove", async () => {
    const { deps } = setup();
    const out = await processAccountDeletion({ userId: USER, userEmail: "vittima@example.com", confirmation: "me@example.com" }, deps);
    expect(out).toEqual({ status: "error", code: "confirmation" });
    expect(deps.deleteAuthUser).not.toHaveBeenCalled();
  });

  it("nessuna richiesta o nessun file: elimina comunque l'utente senza chiamare remove", async () => {
    const { deps } = setup({ listRequestIds: vi.fn(async () => []) });
    expect(await processAccountDeletion(ok, deps)).toEqual({ status: "deleted" });
    expect(deps.removeStoragePaths).not.toHaveBeenCalled();
    expect(deps.deleteAuthUser).toHaveBeenCalledWith(USER);
  });

  it("se la pulizia dello Storage fallisce l'utente NON viene eliminato", async () => {
    const { deps } = setup({ removeStoragePaths: vi.fn(async () => Promise.reject(new Error("storage"))) });
    expect(await processAccountDeletion(ok, deps)).toEqual({ status: "error", code: "storage" });
    expect(deps.deleteAuthUser).not.toHaveBeenCalled();
  });

  it("se non si riescono a elencare i file l'utente NON viene eliminato", async () => {
    const { deps } = setup({ listStoragePaths: vi.fn(async () => Promise.reject(new Error("list"))) });
    expect(await processAccountDeletion(ok, deps)).toEqual({ status: "error", code: "storage" });
    expect(deps.deleteAuthUser).not.toHaveBeenCalled();
  });

  it("errore nell'eliminazione dell'utente: esito 'delete'", async () => {
    const { deps } = setup({ deleteAuthUser: vi.fn(async () => Promise.reject(new Error("auth"))) });
    expect(await processAccountDeletion(ok, deps)).toEqual({ status: "error", code: "delete" });
  });
});
