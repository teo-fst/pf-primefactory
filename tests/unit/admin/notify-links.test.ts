// @vitest-environment node
import { describe, expect, it } from "vitest";
import { adminAreaUrl, customerAreaUrl } from "@/lib/notify/links";

const SITE = "https://primefactory.example";
const ID = "8f8dc854-9469-42bd-b8fe-b93c3f82659b";

describe("adminAreaUrl", () => {
  it("con l'id della richiesta punta al dettaglio nel pannello, nella lingua del destinatario", () => {
    expect(adminAreaUrl(SITE, "it", ID)).toBe(`${SITE}/it/admin/richieste/${ID}`);
    expect(adminAreaUrl(SITE, "en", ID)).toBe(`${SITE}/en/admin/richieste/${ID}`);
  });

  it("senza id, o con un id che non è un UUID, ricade sulla radice del pannello", () => {
    expect(adminAreaUrl(SITE, "it")).toBe(`${SITE}/it/admin`);
    expect(adminAreaUrl(SITE, "it", null)).toBe(`${SITE}/it/admin`);
    expect(adminAreaUrl(SITE, "it", "r-1")).toBe(`${SITE}/it/admin`);
    expect(adminAreaUrl(SITE, "it", `${ID}/../../x`)).toBe(`${SITE}/it/admin`);
  });

  it("il link ai clienti non cambia", () => {
    expect(customerAreaUrl(SITE, "en")).toBe(`${SITE}/en/area-clienti`);
  });
});
