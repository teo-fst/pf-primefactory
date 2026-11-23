import { expect, test } from "@playwright/test";

// Titoli del hero come da content/site-texts.json (caricati nel database dallo script di seed).
const HERO: Record<string, string> = {
  it: "Pezzi su misura, modellati e stampati in Liguria",
  en: "Made-to-measure parts, modelled and printed in Liguria",
};

for (const locale of ["it", "en"]) {
  test(`/${locale} risponde e mostra il titolo hero dal database`, async ({ page }) => {
    const response = await page.goto(`/${locale}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(HERO[locale]);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByRole("link", { name: "Primefactory" }).first()).toBeVisible();
  });
}

test("la home mostra header, nav principale, footer e skip link", async ({ page }) => {
  await page.goto("/it");
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navigazione principale" })).toBeVisible();
  await expect(page.getByRole("contentinfo")).toContainText("Primefactory");
  await expect(page.getByRole("link", { name: "Vai al contenuto" })).toHaveAttribute(
    "href",
    "#contenuto",
  );
});
