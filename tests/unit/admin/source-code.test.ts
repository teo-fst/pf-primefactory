// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isValidSourceCode, slugifySourceCode, uniqueSourceCode } from "@/lib/admin/source-code";

describe("slugifySourceCode", () => {
  it("minuscolo, senza accenti, trattini al posto dei separatori", () => {
    expect(slugifySourceCode("Trackday Misano 2026")).toBe("trackday-misano-2026");
    expect(slugifySourceCode("Fiera dell'Èlite: Moto & Bici!")).toBe("fiera-dell-elite-moto-bici");
  });

  it("toglie trattini ripetuti, iniziali e finali", () => {
    expect(slugifySourceCode("  --Raduno   Sanremo--  ")).toBe("raduno-sanremo");
  });

  it("restituisce vuoto se non resta nessun carattere utile", () => {
    expect(slugifySourceCode("???")).toBe("");
    expect(slugifySourceCode("")).toBe("");
  });

  it("taglia a 80 caratteri senza lasciare un trattino finale", () => {
    const code = slugifySourceCode(`${"a".repeat(79)} bbb`);
    expect(code.length).toBeLessThanOrEqual(80);
    expect(code.endsWith("-")).toBe(false);
    expect(isValidSourceCode(code)).toBe(true);
  });

  it("il risultato è sempre un codice valido per il modulo pubblico", () => {
    for (const title of ["Évènement été 2027", "Moto-raduno #3", "日本 GP", "A_B C"]) {
      const code = slugifySourceCode(title);
      if (code !== "") expect(isValidSourceCode(code)).toBe(true);
    }
  });
});

describe("isValidSourceCode", () => {
  it("accetta a-z, 0-9 e trattino fino a 80 caratteri", () => {
    expect(isValidSourceCode("fiera-2026")).toBe(true);
    expect(isValidSourceCode("a".repeat(80))).toBe(true);
  });

  it("rifiuta maiuscole, spazi, simboli, vuoto e testi troppo lunghi", () => {
    for (const bad of ["Fiera", "fiera 2026", "fiera_2026", "fiera?x=1", "", "a".repeat(81)]) {
      expect(isValidSourceCode(bad)).toBe(false);
    }
  });
});

describe("uniqueSourceCode", () => {
  it("lascia il codice com'è se è libero", () => {
    expect(uniqueSourceCode("fiera", ["altro"])).toBe("fiera");
  });

  it("aggiunge un numero se il codice è già usato", () => {
    expect(uniqueSourceCode("fiera", ["fiera"])).toBe("fiera-2");
    expect(uniqueSourceCode("fiera", ["fiera", "fiera-2"])).toBe("fiera-3");
  });

  it("usa 'evento' se il titolo non dà un codice", () => {
    expect(uniqueSourceCode("", [])).toBe("evento");
    expect(uniqueSourceCode("", ["evento"])).toBe("evento-2");
  });

  it("resta entro 80 caratteri anche con il suffisso", () => {
    const base = "a".repeat(80);
    const code = uniqueSourceCode(base, [base]);
    expect(code.length).toBeLessThanOrEqual(80);
    expect(isValidSourceCode(code)).toBe(true);
    expect(code.endsWith("-2")).toBe(true);
  });
});
