// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  ALLOWED_EXTENSIONS,
  DEFAULT_MAX_UPLOAD_BYTES,
  buildStoragePath,
  cleanMimeType,
  formatBytes,
  getExtension,
  isValidStoragePath,
  parseMaxUploadBytes,
  sanitizeFileName,
  validateFile,
} from "@/lib/account/files";

const REQ = "11111111-2222-4333-8444-555555555555";
const FILE = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

describe("sanitizeFileName", () => {
  it("lascia i nomi già sicuri", () => {
    expect(sanitizeFileName("supporto-targa_v2.stl")).toBe("supporto-targa_v2.stl");
  });
  it("toglie accenti, spazi e simboli", () => {
    expect(sanitizeFileName("Più bella città (finale).STL")).toBe("Piu-bella-citta-finale.stl");
  });
  it("elimina percorsi e tentativi di uscita dalla cartella", () => {
    expect(sanitizeFileName("../../etc/passwd.pdf")).toBe("passwd.pdf");
    expect(sanitizeFileName("C:\\Users\\mario\\modello.3mf")).toBe("modello.3mf");
    expect(sanitizeFileName("a/b/../c.stl")).toBe("c.stl");
  });
  it("nessun punto o trattino iniziale, nessun nome vuoto", () => {
    expect(sanitizeFileName(".htaccess")).toBe("file.htaccess");
    expect(sanitizeFileName("---.zip")).toBe("file.zip");
    expect(sanitizeFileName("")).toBe("file");
    expect(sanitizeFileName("???")).toBe("file");
  });
  it("accorcia i nomi lunghi mantenendo l'estensione", () => {
    const out = sanitizeFileName(`${"a".repeat(300)}.step`);
    expect(out.length).toBeLessThanOrEqual(100);
    expect(out.endsWith(".step")).toBe(true);
  });
  it("caratteri non latini e emoji diventano trattini", () => {
    expect(sanitizeFileName("モデル🙂.stl")).toBe("file.stl");
    expect(sanitizeFileName("a\u0000b.stl")).toBe("a-b.stl");
  });
  it("il risultato usa solo caratteri ammessi", () => {
    for (const name of ["a b&c;d.stl", "x%00y.png", "<script>.pdf", "tab\tnew\nline.zip"]) {
      expect(sanitizeFileName(name)).toMatch(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
    }
  });
});

describe("getExtension", () => {
  it("minuscolo e senza punto", () => {
    expect(getExtension("Modello.STL")).toBe("stl");
    expect(getExtension("archivio.tar.zip")).toBe("zip");
  });
  it("vuota senza estensione", () => {
    expect(getExtension("README")).toBe("");
    expect(getExtension(".gitignore")).toBe("");
    expect(getExtension("file.")).toBe("");
  });
});

describe("validateFile", () => {
  const max = DEFAULT_MAX_UPLOAD_BYTES;
  it("accetta tutte le estensioni dell'elenco, anche in maiuscolo", () => {
    for (const ext of ALLOWED_EXTENSIONS) {
      expect(validateFile({ name: `x.${ext}`, size: 10 }, max)).toEqual({ ok: true });
      expect(validateFile({ name: `x.${ext.toUpperCase()}`, size: 10 }, max)).toEqual({ ok: true });
    }
  });
  it("l'elenco contiene i formati richiesti", () => {
    for (const ext of ["stl", "3mf", "step", "stp", "obj", "jpg", "png", "webp", "heic", "pdf", "zip"]) {
      expect(ALLOWED_EXTENSIONS).toContain(ext);
    }
  });
  it("rifiuta estensioni non ammesse o mancanti", () => {
    for (const name of ["virus.exe", "script.js", "pagina.html", "senza-estensione", "doppia.stl.exe", ".stl"]) {
      expect(validateFile({ name, size: 10 }, max)).toEqual({ ok: false, reason: "extension" });
    }
  });
  it("rifiuta file vuoti", () => {
    expect(validateFile({ name: "a.stl", size: 0 }, max)).toEqual({ ok: false, reason: "empty" });
  });
  it("il limite è incluso: 100 MB passa, un byte in più no", () => {
    expect(validateFile({ name: "a.stl", size: max }, max)).toEqual({ ok: true });
    expect(validateFile({ name: "a.stl", size: max + 1 }, max)).toEqual({ ok: false, reason: "too_large" });
  });
  it("rispetta un limite più basso da site_settings", () => {
    expect(validateFile({ name: "a.stl", size: 2_000_000 }, 1_000_000)).toEqual({ ok: false, reason: "too_large" });
  });
});

describe("parseMaxUploadBytes", () => {
  it("legge il valore jsonb (numero o stringa)", () => {
    expect(parseMaxUploadBytes(52_428_800)).toBe(52_428_800);
    expect(parseMaxUploadBytes("1048576")).toBe(1_048_576);
  });
  it("valori non validi: limite predefinito", () => {
    for (const bad of [undefined, null, "abc", -5, 0, 1.5, {}, NaN]) {
      expect(parseMaxUploadBytes(bad)).toBe(DEFAULT_MAX_UPLOAD_BYTES);
    }
  });
  it("non può superare il tetto del bucket", () => {
    expect(parseMaxUploadBytes(500_000_000)).toBe(DEFAULT_MAX_UPLOAD_BYTES);
  });
});

describe("percorso nello Storage", () => {
  it("<request_id>/<uuid>-<nome sanificato>", () => {
    expect(buildStoragePath(REQ, FILE, "Mia stampa.STL")).toBe(`${REQ}/${FILE}-Mia-stampa.stl`);
  });
  it("il percorso costruito è sempre valido per la propria richiesta", () => {
    expect(isValidStoragePath(buildStoragePath(REQ, FILE, "../../x y.stl"), REQ)).toBe(true);
  });
  it("rifiuta percorsi di un'altra richiesta, con cartelle in più o caratteri strani", () => {
    const other = "99999999-2222-4333-8444-555555555555";
    expect(isValidStoragePath(`${other}/${FILE}-a.stl`, REQ)).toBe(false);
    expect(isValidStoragePath(`${REQ}/sub/${FILE}-a.stl`, REQ)).toBe(false);
    expect(isValidStoragePath(`${REQ}/../${REQ}/${FILE}-a.stl`, REQ)).toBe(false);
    expect(isValidStoragePath(`${REQ}/${FILE}-a b.stl`, REQ)).toBe(false);
    expect(isValidStoragePath(`${REQ}/nome-libero.stl`, REQ)).toBe(false);
    expect(isValidStoragePath(`${REQ}/${FILE}-`, REQ)).toBe(false);
    expect(isValidStoragePath(42, REQ)).toBe(false);
    expect(isValidStoragePath(`${REQ}/${FILE}-a.stl`, "non-uuid")).toBe(false);
  });
});

describe("varie", () => {
  it("cleanMimeType accetta solo tipo/sottotipo", () => {
    expect(cleanMimeType("model/stl")).toBe("model/stl");
    expect(cleanMimeType("application/pdf")).toBe("application/pdf");
    expect(cleanMimeType("")).toBeNull();
    expect(cleanMimeType("<x>")).toBeNull();
    expect(cleanMimeType(5)).toBeNull();
  });
  it("formatBytes", () => {
    expect(formatBytes(500, "it")).toBe("500 B");
    expect(formatBytes(2048, "en")).toBe("2 KB");
    expect(formatBytes(DEFAULT_MAX_UPLOAD_BYTES, "it")).toBe("100 MB");
  });
});
