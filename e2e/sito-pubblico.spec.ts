import { expect, test } from "@playwright/test";

test.describe("linee e visibilita", () => {
  test("una linea attiva risponde 200 e mostra il nome", async ({ page }) => {
    const response = await page.goto("/it/linee/moto-bici");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Moto e bici");
  });

  test("la linea oscurata siti-web-reti risponde 404", async ({ page }) => {
    const response = await page.goto("/it/linee/siti-web-reti");
    expect(response?.status()).toBe(404);
  });

  test("la linea riciclo e solo informativa: nessun invito alla lista d'interesse", async ({ page }) => {
    const response = await page.goto("/it/linee/riciclo");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("note")).toContainText("solo informativa");
    await expect(page.getByRole("main").getByRole("link", { name: /lista d.interesse/i })).toHaveCount(0);
  });

  test("la nav non elenca la linea oscurata", async ({ page }) => {
    await page.goto("/it");
    const nav = page.getByRole("navigation", { name: "Navigazione principale" });
    await expect(nav.getByRole("link", { name: "Moto e bici" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Siti web e reti" })).toHaveCount(0);
  });
});

test.describe("pagine", () => {
  for (const path of ["/it/portfolio", "/it/chi-siamo", "/it/eventi", "/en/portfolio", "/en/eventi"]) {
    test(`${path} risponde 200 con un titolo`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  }

  test("percorso sconosciuto: risponde 404", async ({ page }) => {
    const response = await page.goto("/it/non-esiste");
    expect(response?.status()).toBe(404);
  });

  test("il portfolio vuoto mostra il messaggio di preparazione", async ({ page }) => {
    await page.goto("/it/portfolio?linea=moto-bici");
    await expect(page.getByRole("main")).toContainText(/Nessuna foto|portfolio/i);
  });
});

test.describe("documenti legali", () => {
  test("la privacy mostra la dicitura BOZZA", async ({ page }) => {
    const response = await page.goto("/it/legale/privacy");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("main")).toContainText("BOZZA");
  });

  test("il documento legale e disponibile in inglese", async ({ page }) => {
    const response = await page.goto("/en/legale/cookie");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("main")).toContainText("DRAFT");
  });

  test("uno slug legale sconosciuto risponde 404", async ({ page }) => {
    const response = await page.goto("/it/legale/inesistente");
    expect(response?.status()).toBe(404);
  });

  test("l'HTML grezzo nel Markdown non viene eseguito", async ({ page }) => {
    await page.goto("/it/legale/privacy");
    await expect(page.locator("main script")).toHaveCount(0);
  });
});

test.describe("lingua", () => {
  test("il selettore cambia lingua e mantiene il percorso", async ({ page }) => {
    await page.goto("/it/linee/moto-bici");
    await page.getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en\/linee\/moto-bici$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Motorcycles and bicycles");
  });
});

test.describe("SEO", () => {
  test("la home ha hreflang it/en e canonical", async ({ page }) => {
    await page.goto("/it");
    await expect(page.locator('link[rel="alternate"][hreflang="it"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  });

  test("la home contiene JSON-LD LocalBusiness senza indirizzo stradale", async ({ page }) => {
    await page.goto("/it");
    const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(raw ?? "{}");
    expect(data["@type"]).toBe("LocalBusiness");
    expect(data.name).toBe("Primefactory");
    expect(JSON.stringify(data.areaServed)).toContain("Imperia");
    expect(data.address).toBeUndefined();
  });

  test("sitemap.xml elenca pagine e linee attive, non quelle oscurate", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const xml = await response.text();
    expect(xml).toContain("/it/linee/moto-bici");
    expect(xml).toContain("/en/linee/moto-bici");
    expect(xml).toContain("/it/portfolio");
    expect(xml).toContain("/it/legale/privacy");
    expect(xml).not.toContain("siti-web-reti");
  });

  test("robots.txt indica la sitemap", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain("Sitemap:");
  });
});
