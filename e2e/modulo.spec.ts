import { expect, test, type Page } from "@playwright/test";

// Modulo lista d'interesse e accesso. NESSUN test crea utenti o richieste reali:
// gli errori di validazione si fermano prima di qualsiasi scrittura.
//
// I test che leggono linee e impostazioni dal database sono saltati se E2E_WITH_SUPABASE non è "1"
// (in CI le variabili Supabase sono fittizie). In locale:
//   docker compose --profile e2e run --rm -e E2E_WITH_SUPABASE=1 e2e
const withSupabase = process.env.E2E_WITH_SUPABASE === "1";

const copy = {
  it: { title: "Lista d'interesse", line: "Linea di attività", brand: "Marca", metal: "Metallo", required: "Campo obbligatorio." },
  en: { title: "Interest list", line: "Line of business", brand: "Make", metal: "Metal", required: "This field is required." },
} as const;

async function chooseLine(page: Page, label: string, value: string, expectedField: string) {
  // Ripete finché la pagina e idratata: un change prima dell'idratazione non aggiorna i campi dinamici.
  await expect(async () => {
    await page.getByLabel(label).selectOption(value);
    await expect(page.getByLabel(expectedField, { exact: true })).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 30_000 });
}

test.describe("lista d'interesse (con database)", () => {
  test.skip(!withSupabase, "serve Supabase reale: E2E_WITH_SUPABASE=1");

  for (const locale of ["it", "en"] as const) {
    test(`/${locale}/lista-interesse si apre con i campi comuni`, async ({ page }) => {
      const response = await page.goto(`/${locale}/lista-interesse`);
      expect(response?.status()).toBe(200);
      const c = copy[locale];
      await expect(page.getByRole("heading", { level: 1, name: c.title })).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      for (const name of ["name", "email", "phone", "line", "description", "measures", "deadline", "consent"]) {
        await expect(page.locator(`form [name="${name}"]`)).toHaveCount(1);
      }
      // Solo linee attive che accettano richieste: moto-bici, progettazione, gioielleria
      const values = await page.locator("#line option").evaluateAll((o) => o.map((e) => (e as HTMLOptionElement).value));
      expect(values).toEqual(["", "moto-bici", "progettazione", "gioielleria"]);
    });
  }

  test("i campi dinamici cambiano con la linea scelta", async ({ page }) => {
    await page.goto("/it/lista-interesse");
    await expect(page.getByTestId("dynamic-fields")).toHaveCount(0);

    await chooseLine(page, copy.it.line, "moto-bici", copy.it.brand);
    await expect(page.getByLabel("Modello", { exact: true })).toBeVisible();
    await expect(page.getByLabel(copy.it.metal, { exact: true })).toHaveCount(0);

    await chooseLine(page, copy.it.line, "gioielleria", copy.it.metal);
    await expect(page.getByLabel(copy.it.brand, { exact: true })).toHaveCount(0);

    await chooseLine(page, copy.it.line, "progettazione", "Servizio");
    await expect(page.getByLabel("Voglio ricevere il file del modello")).toBeVisible();
  });

  test("le etichette dei campi dinamici seguono la lingua", async ({ page }) => {
    await page.goto("/en/lista-interesse");
    await chooseLine(page, copy.en.line, "moto-bici", copy.en.brand);
    await expect(page.getByLabel("Use", { exact: true })).toBeVisible();
  });

  test("l'invio vuoto mostra gli errori di validazione", async ({ page }) => {
    await page.goto("/it/lista-interesse");
    await page.getByRole("button", { name: "Invia la richiesta" }).click();
    await expect(page.getByText("Controlla i campi evidenziati.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(copy.it.required).first()).toBeVisible();
    await expect(page.getByText("Per inviare la richiesta devi accettare l'informativa sulla privacy.")).toBeVisible();
    // Resta sul modulo: nessuna richiesta inviata
    await expect(page).toHaveURL(/\/it\/lista-interesse$/);
  });

  test("errori nei campi dinamici obbligatori e valori conservati", async ({ page }) => {
    await page.goto("/it/lista-interesse");
    await chooseLine(page, copy.it.line, "moto-bici", copy.it.brand);
    await page.getByLabel("Nome e cognome").fill("Mario Rossi");
    await page.getByLabel("Email").fill("mail-sbagliata");
    await page.getByLabel("Descrizione della richiesta").fill("Supporto targa per R6, PETG nero.");
    await page.getByRole("button", { name: "Invia la richiesta" }).click();
    await expect(page.getByText("Inserisci un indirizzo email valido.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(copy.it.required).first()).toBeVisible(); // Marca e Uso obbligatori
    await expect(page.getByLabel("Nome e cognome")).toHaveValue("Mario Rossi");
    await expect(page.getByLabel("Descrizione della richiesta")).toHaveValue("Supporto targa per R6, PETG nero.");
  });

  test("?fonte= valida finisce nel campo nascosto, non valida viene ignorata", async ({ page }) => {
    await page.goto("/it/lista-interesse?fonte=trackday-misano-2027");
    await expect(page.locator('input[type="hidden"][name="fonte"]')).toHaveValue("trackday-misano-2027");
    await page.goto("/it/lista-interesse?fonte=" + encodeURIComponent("<script>alert(1)</script>"));
    await expect(page.locator('input[name="fonte"]')).toHaveCount(0);
  });

  test("il campo trappola e fuori dalla vista e fuori dalla tastiera", async ({ page }) => {
    await page.goto("/it/lista-interesse");
    const trap = page.locator('input[name="company_website"]');
    await expect(trap).toHaveAttribute("tabindex", "-1");
    await expect(trap).toHaveAttribute("autocomplete", "off");
    await expect(page.locator('[aria-hidden="true"]:has(input[name="company_website"])')).toHaveCount(1);
  });

  test("la pagina di conferma mostra i testi e non e indicizzabile", async ({ page }) => {
    const response = await page.goto("/it/lista-interesse/conferma");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("status")).toContainText("Richiesta ricevuta");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});

test.describe("accesso e area clienti (senza database)", () => {
  for (const locale of ["it", "en"] as const) {
    test(`/${locale}/area-clienti senza sessione porta ad accedi`, async ({ page }) => {
      await page.goto(`/${locale}/area-clienti`);
      await expect(page).toHaveURL(new RegExp(`/${locale}/accedi$`));
      await expect(page.locator('input[name="email"]')).toBeVisible();
    });
  }

  test("la pagina accedi mostra il modulo e rifiuta un'email non valida", async ({ page }) => {
    await page.goto("/it/accedi");
    await expect(page.getByRole("heading", { level: 1, name: "Accedi all'area clienti" })).toBeVisible();
    await page.getByLabel("Email").fill("non-una-email");
    await page.getByRole("button", { name: "Inviami il link" }).click();
    await expect(page.getByText("Inserisci un indirizzo email valido.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("login-sent")).toHaveCount(0);
  });

  test("un link non valido mostra l'errore nella lingua giusta, senza redirect esterni", async ({ page }) => {
    await page.goto("/auth/confirm?token_hash=non-valido&type=email&redirect_to=http%3A%2F%2Fexample.com%2Fen%2Farea-clienti");
    // La destinazione usa solo la lingua: niente redirect verso example.com
    await expect(page).toHaveURL(/\/en\/accedi\?errore=link$/);
    await expect(page.getByText("The link is not valid or has expired. Please request a new one.")).toBeVisible();
  });

  test("/auth/confirm senza parametri riporta ad accedi", async ({ page }) => {
    await page.goto("/auth/confirm");
    await expect(page).toHaveURL(/\/it\/accedi\?errore=link$/);
  });
});

// Il matcher del proxy aveva un escape perso (".*\..*" in una stringa JS diventa ".*..*") e il proxy
// girava solo su "/": nessun redirect di lingua sulle altre rotte, nessun refresh della sessione.
test.describe("proxy: redirect di lingua e rotte /auth", () => {
  test("/lista-interesse senza lingua viene reindirizzato a /it/lista-interesse", async ({ request }) => {
    const res = await request.get("/lista-interesse", { maxRedirects: 0 });
    expect([307, 308]).toContain(res.status());
    expect(new URL(res.headers().location, "http://x").pathname).toBe("/it/lista-interesse");
  });

  test("senza lingua nell'indirizzo si rispetta Accept-Language", async ({ request }) => {
    const res = await request.get("/lista-interesse", { maxRedirects: 0, headers: { "accept-language": "en" } });
    expect([307, 308]).toContain(res.status());
    expect(new URL(res.headers().location, "http://x").pathname).toBe("/en/lista-interesse");
  });

  test("/auth/confirm non riceve il prefisso lingua dal proxy", async ({ request }) => {
    // Al primo accesso il server di sviluppo (Turbopack) compila la rotta e a volte risponde 500
    // se altri test compilano in parallelo ("Unexpected end of JSON input" dal manifest): si riprova.
    let res = await request.get("/auth/confirm", { maxRedirects: 0 });
    for (let attempt = 0; attempt < 3 && res.status() === 500; attempt++) {
      res = await request.get("/auth/confirm", { maxRedirects: 0 });
    }
    expect(res.status()).toBe(303);
    // Se il proxy la trattasse come pagina, finirebbe su /it/auth/confirm (404)
    expect(new URL(res.headers().location, "http://x").pathname).toBe("/it/accedi");
  });
});
