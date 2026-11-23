// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildStoragePath } from "@/lib/account/files";
import { processFileRegistration, type RegisterDeps } from "@/lib/account/register-file";

const USER = "00000000-0000-4000-8000-000000000001";
const REQ = "11111111-2222-4333-8444-555555555555";
const OTHER_REQ = "99999999-2222-4333-8444-555555555555";
const FILE = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const PATH = buildStoragePath(REQ, FILE, "targa.stl");

function setup(over: Partial<RegisterDeps> = {}, status = "richiesta") {
  const deps = {
    userId: USER,
    maxBytes: 1_000_000,
    findOwnedRequest: vi.fn(async (id: string) => (id === REQ ? { id, status } : null)),
    getObjectSize: vi.fn(async () => 1234 as number | null),
    insertFile: vi.fn(async () => true),
    advanceToFilesReceived: vi.fn(async () => {}),
    ...over,
  } satisfies RegisterDeps;
  return deps;
}
const input = { requestId: REQ, path: PATH, name: "targa.stl", size: 1234, mimeType: "model/stl" };

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

describe("processFileRegistration", () => {
  it("richiesta propria: registra il file e porta la richiesta a file_ricevuti", async () => {
    const d = setup();
    expect(await processFileRegistration(input, d)).toEqual({ ok: true, advanced: true });
    expect(d.insertFile).toHaveBeenCalledWith({
      request_id: REQ,
      storage_path: PATH,
      original_name: "targa.stl",
      size_bytes: 1234,
      mime_type: "model/stl",
      uploaded_by: USER,
    });
    expect(d.advanceToFilesReceived).toHaveBeenCalledWith(REQ);
  });

  it("richiesta già avanzata: registra il file ma non cambia lo stato", async () => {
    const d = setup({}, "in_valutazione");
    expect(await processFileRegistration(input, d)).toEqual({ ok: true, advanced: false });
    expect(d.advanceToFilesReceived).not.toHaveBeenCalled();
  });

  it("richiesta di un altro cliente: nessuna scrittura, nessun cambio di stato", async () => {
    const d = setup({ findOwnedRequest: vi.fn(async () => null) });
    expect(await processFileRegistration(input, d)).toEqual({ ok: false, code: "not_found" });
    expect(d.getObjectSize).not.toHaveBeenCalled();
    expect(d.insertFile).not.toHaveBeenCalled();
    expect(d.advanceToFilesReceived).not.toHaveBeenCalled();
  });

  it("percorso che punta a un'altra richiesta: rifiutato prima di ogni lettura", async () => {
    const d = setup();
    const out = await processFileRegistration({ ...input, path: buildStoragePath(OTHER_REQ, FILE, "x.stl") }, d);
    expect(out).toEqual({ ok: false, code: "invalid" });
    expect(d.findOwnedRequest).not.toHaveBeenCalled();
    expect(d.insertFile).not.toHaveBeenCalled();
  });

  it("input non valido o manipolato", async () => {
    const d = setup();
    for (const bad of [
      { ...input, requestId: "x" },
      { ...input, requestId: undefined },
      { ...input, name: "" },
      { ...input, size: "1234" },
      { ...input, size: 12.5 },
      { ...input, path: `${REQ}/${FILE}-../../x.stl` },
    ]) {
      expect((await processFileRegistration(bad, d)).ok).toBe(false);
    }
    expect(d.insertFile).not.toHaveBeenCalled();
  });

  it("estensione non ammessa, file vuoto, file troppo grande", async () => {
    const d = setup();
    const exe = buildStoragePath(REQ, FILE, "a.exe");
    expect(await processFileRegistration({ ...input, path: exe, name: "a.exe" }, d)).toEqual({ ok: false, code: "extension" });
    expect(await processFileRegistration({ ...input, size: 0 }, d)).toEqual({ ok: false, code: "empty" });
    expect(await processFileRegistration({ ...input, size: 1_000_001 }, d)).toEqual({ ok: false, code: "too_large" });
    expect(d.insertFile).not.toHaveBeenCalled();
  });

  it("oggetto assente o di dimensione diversa nello Storage: non si registra", async () => {
    expect(await processFileRegistration(input, setup({ getObjectSize: vi.fn(async () => null) }))).toEqual({
      ok: false,
      code: "missing_object",
    });
    expect(await processFileRegistration(input, setup({ getObjectSize: vi.fn(async () => 99) }))).toEqual({
      ok: false,
      code: "missing_object",
    });
  });

  it("errore del database: nessun cambio di stato", async () => {
    const d = setup({ insertFile: vi.fn(async () => false) });
    expect(await processFileRegistration(input, d)).toEqual({ ok: false, code: "db" });
    expect(d.advanceToFilesReceived).not.toHaveBeenCalled();
  });

  it("se il passaggio di stato fallisce il file resta registrato", async () => {
    const d = setup({ advanceToFilesReceived: vi.fn(async () => Promise.reject(new Error("x"))) });
    expect(await processFileRegistration(input, d)).toEqual({ ok: true, advanced: false });
  });

  it("mime type strano diventa null; nome originale senza percorso", async () => {
    const d = setup();
    await processFileRegistration({ ...input, name: "C:\\tmp\\targa.stl", mimeType: "<b>" }, d);
    expect(d.insertFile).toHaveBeenCalledWith(expect.objectContaining({ original_name: "targa.stl", mime_type: null }));
  });
});
