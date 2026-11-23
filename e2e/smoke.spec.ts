import { expect, test } from "@playwright/test";

for (const locale of ["it", "en"]) {
  test(`/${locale} risponde e mostra Primefactory`, async ({ page }) => {
    const response = await page.goto(`/${locale}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Primefactory" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
  });
}
