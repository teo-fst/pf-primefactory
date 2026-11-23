import { describe, expect, it } from "vitest";
import { isLegalSlug, LEGAL_SLUGS, legalKindFromSlug } from "@/lib/content/legal-map";

describe("mappa documenti legali", () => {
  it("converte ogni slug nel kind del database", () => {
    expect(legalKindFromSlug("privacy")).toBe("privacy");
    expect(legalKindFromSlug("cookie")).toBe("cookie");
    expect(legalKindFromSlug("termini")).toBe("termini");
    expect(legalKindFromSlug("consenso-riuso")).toBe("consenso_riuso");
    expect(legalKindFromSlug("solo-uso-pista")).toBe("solo_uso_pista");
  });

  it("rifiuta slug sconosciuti, anche se somigliano a proprieta di Object", () => {
    expect(legalKindFromSlug("altro")).toBeNull();
    expect(legalKindFromSlug("consenso_riuso")).toBeNull();
    expect(legalKindFromSlug("constructor")).toBeNull();
    expect(isLegalSlug("__proto__")).toBe(false);
  });

  it("elenca cinque documenti", () => {
    expect(LEGAL_SLUGS).toHaveLength(5);
  });
});
