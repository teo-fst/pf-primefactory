// @vitest-environment node
import { describe, expect, it } from "vitest";
import { classifyDbError } from "@/lib/admin/db-errors";
import { eventSignupUrl, qrSvg } from "@/lib/admin/qr";
import { PAGE_SIZE, parseRequestFilters, requestsHref, sanitizeSearchText } from "@/lib/admin/request-filters";
import { getAdminMessages } from "@/lib/admin/messages";

describe("parseRequestFilters", () => {
  it("senza parametri: nessun filtro, pagina 1", () => {
    expect(parseRequestFilters({})).toEqual({ status: null, line: null, kind: null, source: null, q: null, page: 1 });
  });

  it("legge i filtri validi", () => {
    expect(
      parseRequestFilters({ stato: "in_valutazione", linea: "moto-bici", tipo: "preventivo", fonte: "Fiera-2026", q: " PF-26 ", pagina: "3" }),
    ).toEqual({ status: "in_valutazione", line: "moto-bici", kind: "preventivo", source: "fiera-2026", q: "PF-26", page: 3 });
  });

  it("scarta i valori non ammessi", () => {
    const f = parseRequestFilters({ stato: "x;drop", linea: "A B", tipo: "altro", fonte: "a b", pagina: "-2" });
    expect(f).toEqual({ status: null, line: null, kind: null, source: null, q: null, page: 1 });
    expect(parseRequestFilters({ pagina: "abc" }).page).toBe(1);
    expect(parseRequestFilters({ pagina: "99999999" }).page).toBe(1);
  });

  it("prende il primo valore se il parametro è ripetuto", () => {
    expect(parseRequestFilters({ stato: ["chiuso", "richiesta"] }).status).toBe("chiuso");
  });
});

describe("sanitizeSearchText", () => {
  it("toglie i caratteri che cambierebbero il filtro", () => {
    expect(sanitizeSearchText("a,b)(c")).toBe("a b c");
    expect(sanitizeSearchText(`x%y_z"w'q\\`)).toBe("x y z w q");
    expect(sanitizeSearchText("  tanti    spazi ")).toBe("tanti spazi");
  });

  it("limita la lunghezza", () => {
    expect(sanitizeSearchText("a".repeat(500)).length).toBe(100);
  });
});

describe("requestsHref", () => {
  it("ricostruisce l'indirizzo con i filtri e la pagina", () => {
    expect(requestsHref({})).toBe("/admin/richieste");
    expect(requestsHref({ status: "chiuso", q: "anello" }, 2)).toBe("/admin/richieste?stato=chiuso&q=anello&pagina=2");
    expect(requestsHref({ status: "chiuso" }, 1)).toBe("/admin/richieste?stato=chiuso");
  });

  it("la pagina ha 20 righe", () => expect(PAGE_SIZE).toBe(20));
});

describe("classifyDbError", () => {
  it("riconosce il vincolo dei diritti del portfolio", () => {
    expect(
      classifyDbError({ code: "23514", message: 'new row for relation "portfolio_items" violates check constraint "portfolio_rights_before_publish"' }),
    ).toBe("rights_required");
  });

  it("riconosce gli altri rifiuti del database", () => {
    expect(classifyDbError({ code: "23505", message: "duplicate key" })).toBe("duplicate");
    expect(classifyDbError({ code: "23514", message: "ultimo_admin" })).toBe("last_admin");
    expect(classifyDbError({ code: "P0001", message: "stato_invariato" })).toBe("same_status");
    expect(classifyDbError({ code: "42501", message: "richiesta_non_accessibile" })).toBe("forbidden");
    expect(classifyDbError({ code: "23503", message: "fk" })).toBe("invalid_reference");
    expect(classifyDbError({ code: "22001", message: "nota_troppo_lunga" })).toBe("too_long");
    expect(classifyDbError({ code: "23514", message: "altro" })).toBe("constraint");
    expect(classifyDbError({ code: "XX000", message: "boh" })).toBe("unknown");
    expect(classifyDbError(null)).toBe("unknown");
  });
});

describe("QR degli eventi", () => {
  it("punta al modulo d'interesse con il codice fonte, nella lingua scelta", () => {
    expect(eventSignupUrl("it", "fiera-2026")).toMatch(/\/it\/lista-interesse\?fonte=fiera-2026$/);
    expect(eventSignupUrl("en", "fiera-2026")).toMatch(/\/en\/lista-interesse\?fonte=fiera-2026$/);
  });

  it("genera un SVG con i moduli del codice", () => {
    const svg = qrSvg("https://example.invalid/it/lista-interesse?fonte=fiera-2026");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("</svg>");
  });
});

describe("messaggi del pannello", () => {
  it("le sezioni principali ci sono", () => {
    const m = getAdminMessages("it");
    for (const key of ["nav", "common", "dashboard", "requests", "portfolio", "events", "content", "users", "notifications"] as const) {
      expect(m[key]).toBeTruthy();
    }
  });
});
