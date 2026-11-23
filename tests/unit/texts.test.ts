import { afterEach, describe, expect, it, vi } from "vitest";
import { mergeTexts, splitStep, toParagraphs } from "@/lib/content/texts";

describe("mergeTexts", () => {
  it("senza database usa il file di riserva nella lingua richiesta", () => {
    const en = mergeTexts("en", null);
    expect(en["home.hero.title"]).toContain("Made-to-measure");
    const it = mergeTexts("it", null);
    expect(it["home.hero.title"]).toContain("Pezzi su misura");
  });

  it("il database ha la precedenza sul file", () => {
    const merged = mergeTexts("it", [
      { key: "home.hero.title", locale: "it", value: "Titolo dal database" },
    ]);
    expect(merged["home.hero.title"]).toBe("Titolo dal database");
  });

  it("una chiave mancante in inglese ricade sull'italiano del database", () => {
    const merged = mergeTexts("en", [
      { key: "nuova.chiave", locale: "it", value: "Solo in italiano" },
    ]);
    expect(merged["nuova.chiave"]).toBe("Solo in italiano");
  });

  it("la lingua richiesta batte l'italiano", () => {
    const merged = mergeTexts("en", [
      { key: "nuova.chiave", locale: "it", value: "Italiano" },
      { key: "nuova.chiave", locale: "en", value: "English" },
    ]);
    expect(merged["nuova.chiave"]).toBe("English");
  });

  it("un testo inglese nel database batte quello italiano nel file", () => {
    const merged = mergeTexts("en", [
      { key: "home.hero.title", locale: "en", value: "English from database" },
    ]);
    expect(merged["home.hero.title"]).toBe("English from database");
  });
});

describe("helper di testo", () => {
  it("toParagraphs divide sulle righe vuote", () => {
    expect(toParagraphs("uno\n\ndue\n\n\ntre")).toEqual(["uno", "due", "tre"]);
    expect(toParagraphs(undefined)).toEqual([]);
  });

  it("splitStep separa titolo e testo del passo", () => {
    expect(splitStep("Richiesta. Compili il modulo.")).toEqual({
      title: "Richiesta",
      body: "Compili il modulo.",
    });
    expect(splitStep("Solo testo")).toEqual({ title: "", body: "Solo testo" });
  });
});

describe("getSiteTexts", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("se il database fallisce restituisce i testi del file senza sollevare errori", async () => {
    vi.doMock("@/lib/content/client", () => ({
      createPublicClient: () => {
        throw new Error("database non raggiungibile");
      },
      portfolioImageUrl: () => null,
    }));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { getSiteTexts } = await import("@/lib/content");
    const texts = await getSiteTexts("en");
    expect(texts["footer.prelaunch"]).toBe("Pre-launch site. No online sales.");
  });
});
