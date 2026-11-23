import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import {
  adminClient,
  canRunWithSupabase,
  countLeftoverTestUsers,
  createTestRequest,
  createTestUser,
  findUserId,
  magicLinkHash,
  publishableKey,
  purgeUser,
  sessionClient,
  supabaseUrl,
  type AdminClient,
} from "./helpers/supabase-test";

// Area clienti (F1.8) con il database reale. Si esegue solo con E2E_WITH_SUPABASE=1:
//   docker compose -p pf-area --profile e2e run --rm -e E2E_WITH_SUPABASE=1 e2e e2e/area-clienti.spec.ts
// Crea due utenti di prova (pf-test+area@... e pf-test+area-b@...) e li elimina SEMPRE a fine giro
// (afterAll), anche se un test fallisce. Il test finale elimina l'account A dall'interfaccia.

const EMAIL_A = "pf-test+area@example.invalid";
const EMAIL_B = "pf-test+area-b@example.invalid";
const baseURL = process.env.BASE_URL || "http://localhost:3000";

test.describe.configure({ mode: "serial", timeout: 120_000 });

// React aggiunge `__reactProps$...` ai nodi DOM quando li idrata: senza questa attesa un'azione fatta
// subito dopo il caricamento (change, click) arriva prima dei gestori e non produce effetti.
async function hydrated(page: Page, testId: string) {
  await page.waitForFunction(
    (id) => {
      const el = document.querySelector(`[data-testid="${id}"]`);
      return !!el && Object.keys(el).some((k) => k.startsWith("__reactProps"));
    },
    testId,
    { timeout: 60_000 },
  );
}

test.describe("area clienti (con database)", () => {
  test.skip(!canRunWithSupabase, "serve Supabase reale: E2E_WITH_SUPABASE=1 e SUPABASE_SECRET_KEY");

  let admin: AdminClient;
  let userA = "";
  let userB = "";
  let requestA = { id: "", public_code: "" };
  let requestB = { id: "", public_code: "" };
  let storagePathA = "";
  const contexts: BrowserContext[] = [];

  async function login(browser: Browser, email: string): Promise<Page> {
    const context = await browser.newContext({ baseURL });
    contexts.push(context);
    const page = await context.newPage();
    const hash = await magicLinkHash(admin, email);
    await page.goto(`/auth/confirm?token_hash=${hash}&type=email&redirect_to=${encodeURIComponent("/it/area-clienti")}`);
    await expect(page).toHaveURL(/\/it\/area-clienti$/);
    return page;
  }

  test.beforeAll(async () => {
    admin = adminClient();
    // Pulizia di eventuali residui di un giro precedente interrotto.
    await purgeUser(admin, EMAIL_A);
    await purgeUser(admin, EMAIL_B);

    userA = await createTestUser(admin, EMAIL_A, "Test Area A");
    userB = await createTestUser(admin, EMAIL_B, "Test Area B");
    requestA = await createTestRequest(admin, userA, "Supporto targa per la mia moto di prova, PETG nero.", {
      marca: "Yamaha",
      uso: "pista",
    });
    requestB = await createTestRequest(admin, userB, "Richiesta dell'altro utente di prova, non deve vedersi.");

    // Un messaggio del team e una nota interna (author_id nullo: scritti dal server, non da un cliente).
    await admin.from("request_messages").insert([
      { request_id: requestA.id, author_id: null, body: "Messaggio pubblico del team", internal: false },
      { request_id: requestA.id, author_id: null, body: "NOTA INTERNA riservata", internal: true },
    ]);
  });

  test.afterAll(async () => {
    for (const context of contexts) await context.close().catch(() => undefined);
    // Garantito anche se un test e fallito: Storage prima, poi utenti (cascata su tutto il resto).
    await purgeUser(admin, EMAIL_A).catch((e) => console.error("pulizia A:", e));
    await purgeUser(admin, EMAIL_B).catch((e) => console.error("pulizia B:", e));
  });

  test("elenco -> dettaglio: dati, campi dinamici, timeline, messaggi senza note interne", async ({ browser }) => {
    const page = await login(browser, EMAIL_A);
    await expect(page.getByTestId("requests-table")).toContainText(requestA.public_code);
    await expect(page.getByTestId("requests-table")).not.toContainText(requestB.public_code);

    await page.getByRole("link", { name: requestA.public_code }).click();
    await expect(page).toHaveURL(new RegExp(`/it/area-clienti/${requestA.public_code}$`), { timeout: 45_000 }); // prima visita: compila la rotta in sviluppo
    await expect(page.getByRole("heading", { level: 1 })).toContainText(requestA.public_code);
    await expect(page.getByText("Supporto targa per la mia moto di prova, PETG nero.")).toBeVisible();

    // Campi dinamici con le etichette della form_schema (non le chiavi grezze)
    const details = page.getByTestId("request-details");
    await expect(details).toContainText("Marca");
    await expect(details).toContainText("Yamaha");
    await expect(details).toContainText("Uso");
    await expect(details).toContainText("Pista");

    // Timeline: solo stati visibili al cliente
    await expect(page.getByTestId("timeline")).toContainText("Richiesta ricevuta");

    // Conversazione: messaggio pubblico si, nota interna mai
    await expect(page.getByTestId("messages-list")).toContainText("Messaggio pubblico del team");
    await expect(page.getByText("NOTA INTERNA")).toHaveCount(0);
  });

  test("carica un file: va su Storage, e registrato e lo stato passa a 'File ricevuti'", async ({ browser }) => {
    const page = await login(browser, EMAIL_A);
    await page.goto(`/it/area-clienti/${requestA.public_code}`);
    await expect(page.getByTestId("request-status")).toHaveText("Richiesta ricevuta");

    const content = Buffer.from("solid test\nendsolid test\n");
    await hydrated(page, "upload-input");
    await page.getByTestId("upload-input").setInputFiles({ name: "Mia stampa è.STL", mimeType: "model/stl", buffer: content });
    await expect(page.getByTestId("files-list")).toContainText("Mia stampa è.STL", { timeout: 30_000 });

    await expect(page.getByTestId("upload-list").getByText("Caricato")).toBeVisible();
    await expect(page.getByTestId("request-status")).toHaveText("File ricevuti");
    await expect(page.getByTestId("timeline")).toContainText("File ricevuti");

    // Verifica in DB e Storage
    const { data: files } = await admin.from("request_files").select("*").eq("request_id", requestA.id);
    expect(files).toHaveLength(1);
    const file = files![0];
    storagePathA = file.storage_path;
    expect(file.uploaded_by).toBe(userA);
    expect(file.original_name).toBe("Mia stampa è.STL");
    expect(file.size_bytes).toBe(content.length);
    expect(storagePathA).toMatch(new RegExp(`^${requestA.id}/[0-9a-f-]{36}-Mia-stampa-e\\.stl$`));
    const { data: req } = await admin.from("requests").select("status").eq("id", requestA.id).single();
    expect(req!.status).toBe("file_ricevuti");
    const { data: history } = await admin.from("request_status_history").select("to_status").eq("request_id", requestA.id).order("id");
    expect(history!.map((h) => h.to_status)).toEqual(["richiesta", "file_ricevuti"]);

    // Download con URL firmato di breve durata (redirect dal server)
    const href = await page.getByRole("link", { name: "Scarica" }).getAttribute("href");
    const res = await page.request.get(href!, { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    const location = res.headers()["location"];
    expect(location).toContain("/storage/v1/object/sign/request-files/");
    expect(location).toContain("token=");
    expect(res.headers()["cache-control"]).toContain("no-store");
    const downloaded = await page.request.get(location);
    expect(downloaded.status()).toBe(200);
    expect(await downloaded.body()).toEqual(content);
  });

  test("file con estensione non ammessa: rifiutato, nessuna riga in DB", async ({ browser }) => {
    const page = await login(browser, EMAIL_A);
    await page.goto(`/it/area-clienti/${requestA.public_code}`);
    await hydrated(page, "upload-input");
    await page.getByTestId("upload-input").setInputFiles({ name: "virus.exe", mimeType: "application/octet-stream", buffer: Buffer.from("MZ") });
    await expect(page.getByTestId("upload-list")).toContainText("Formato non ammesso");
    const { count } = await admin.from("request_files").select("*", { count: "exact", head: true }).eq("request_id", requestA.id);
    expect(count).toBe(1);
  });

  test("scrive un messaggio: compare in conversazione ed e salvato come messaggio del cliente", async ({ browser }) => {
    const page = await login(browser, EMAIL_A);
    await page.goto(`/it/area-clienti/${requestA.public_code}`);
    const text = "Ciao, <b>non</b> e HTML.\nSeconda riga.";
    await hydrated(page, "message-form");
    await page.getByLabel("Scrivi un messaggio").fill(text);
    await page.getByRole("button", { name: "Invia" }).click();
    await expect(page.getByText("Messaggio inviato.")).toBeVisible({ timeout: 30_000 });

    const list = page.getByTestId("messages-list");
    await expect(list).toContainText("Ciao, <b>non</b> e HTML.");
    await expect(list.locator("b")).toHaveCount(0);
    const { data } = await admin.from("request_messages").select("author_id, internal, body").eq("request_id", requestA.id).eq("author_id", userA);
    expect(data).toEqual([{ author_id: userA, internal: false, body: text }]);

    // Messaggio vuoto: errore e nessun invio
    await page.getByRole("button", { name: "Invia" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Scrivi un messaggio." })).toBeVisible();
  });

  test("un secondo utente NON vede richiesta, file, messaggi, ne via pagina ne via API ne via Storage", async ({ browser }) => {
    const page = await login(browser, EMAIL_B);
    // Elenco: solo la propria
    await expect(page.getByTestId("requests-table")).toContainText(requestB.public_code);
    await expect(page.getByTestId("requests-table")).not.toContainText(requestA.public_code);

    // URL diretto della richiesta di A: 404
    const detail = await page.goto(`/it/area-clienti/${requestA.public_code}`);
    expect(detail?.status()).toBe(404);
    await expect(page.getByText("Supporto targa per la mia moto di prova")).toHaveCount(0);

    // URL diretto del file di A (id reale): 404, mai redirect verso Storage
    const { data: files } = await admin.from("request_files").select("id").eq("request_id", requestA.id);
    const fileId = files![0].id;
    const dl = await page.request.get(`/it/area-clienti/${requestA.public_code}/file/${fileId}`, { maxRedirects: 0 });
    expect(dl.status()).toBe(404);
    // anche usando il proprio codice richiesta con l'id del file di A
    const dl2 = await page.request.get(`/it/area-clienti/${requestB.public_code}/file/${fileId}`, { maxRedirects: 0 });
    expect(dl2.status()).toBe(404);

    // Via API con la sessione di B: nessuna riga e nessun accesso allo Storage
    const { client, token } = await sessionClient(admin, EMAIL_B);
    for (const table of ["request_files", "request_messages", "request_status_history"] as const) {
      const { data } = await client.from(table).select("*").eq("request_id", requestA.id);
      expect(data, table).toEqual([]);
    }
    const { data: reqs } = await client.from("requests").select("id");
    expect(reqs!.map((r) => r.id)).toEqual([requestB.id]);
    const signed = await client.storage.from("request-files").createSignedUrl(storagePathA, 60);
    expect(signed.data).toBeNull();
    expect(signed.error).not.toBeNull();
    const listed = await client.storage.from("request-files").list(requestA.id);
    expect(listed.data ?? []).toEqual([]);
    const direct = await fetch(`${supabaseUrl}/storage/v1/object/authenticated/request-files/${storagePathA}`, {
      headers: { Authorization: `Bearer ${token}`, apikey: publishableKey },
    });
    expect(direct.status).toBeGreaterThanOrEqual(400);
    // Nemmeno scrivere nella cartella della richiesta di A
    const up = await client.storage.from("request-files").upload(`${requestA.id}/${"0".repeat(8)}-0000-4000-8000-${"0".repeat(12)}-x.stl`, Buffer.from("x"));
    expect(up.error).not.toBeNull();
    // Nessun file pubblico: senza sessione l'URL pubblico non serve nulla
    const pub = await fetch(`${supabaseUrl}/storage/v1/object/public/request-files/${storagePathA}`);
    expect(pub.status).toBeGreaterThanOrEqual(400);
  });

  test("profilo: modifica nome, telefono e lingua", async ({ browser }) => {
    const page = await login(browser, EMAIL_A);
    await page.goto("/it/area-clienti/profilo");
    await expect(page.getByLabel("Email (non modificabile)")).toHaveValue(EMAIL_A);
    await hydrated(page, "profile-form");
    await page.getByLabel("Nome e cognome").fill("Mario Prova Aggiornato");
    await page.getByLabel(/Telefono/).fill("+39 333 1234567");
    await page.locator("#profile-locale").selectOption("en");
    await page.getByRole("button", { name: "Salva" }).click();
    await expect(page.getByTestId("profile-saved")).toBeVisible({ timeout: 30_000 });
    const { data } = await admin.from("profiles").select("full_name, phone, locale, role").eq("id", userA).single();
    expect(data).toEqual({ full_name: "Mario Prova Aggiornato", phone: "+39 333 1234567", locale: "en", role: "cliente" });

    // Valore non valido: errore, nessuna modifica
    await page.getByLabel(/Telefono/).fill("non un telefono");
    await page.getByRole("button", { name: "Salva" }).click();
    await expect(page.getByText("Inserisci un numero di telefono valido.")).toBeVisible();
  });

  test("elimina il mio account: conferma con l'email, poi nulla resta in DB e Storage", async ({ browser }) => {
    const page = await login(browser, EMAIL_A);
    await page.goto("/it/area-clienti/profilo");
    const button = page.getByRole("button", { name: "Elimina definitivamente" });
    await expect(button).toBeDisabled();

    await hydrated(page, "delete-form");
    await page.getByLabel(/Per confermare, scrivi la tua email/).fill("sbagliata@example.invalid");
    await expect(button).toBeDisabled();
    await page.getByLabel(/Per confermare, scrivi la tua email/).fill(EMAIL_A);
    await expect(button).toBeEnabled();

    // Prima dell'eliminazione ci sono dati e file
    const { count: before } = await admin.from("requests").select("*", { count: "exact", head: true }).eq("customer_id", userA);
    expect(before).toBe(1);
    const { data: objectsBefore } = await admin.storage.from("request-files").list(requestA.id);
    expect(objectsBefore!.length).toBe(1);

    await button.click();
    await expect(page).toHaveURL(/\/it\/account-eliminato$/, { timeout: 30_000 });
    await expect(page.getByTestId("account-deleted")).toContainText("Il tuo account");

    // Nulla resta: utente, profilo, richieste, file, messaggi, storico, oggetti di Storage
    expect(await findUserId(admin, EMAIL_A)).toBeNull();
    const checks = await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }).eq("id", userA),
      admin.from("requests").select("*", { count: "exact", head: true }).eq("id", requestA.id),
      admin.from("request_files").select("*", { count: "exact", head: true }).eq("request_id", requestA.id),
      admin.from("request_messages").select("*", { count: "exact", head: true }).eq("request_id", requestA.id),
      admin.from("request_status_history").select("*", { count: "exact", head: true }).eq("request_id", requestA.id),
    ]);
    for (const c of checks) expect(c.count).toBe(0);
    const { data: objectsAfter } = await admin.storage.from("request-files").list(requestA.id);
    expect(objectsAfter ?? []).toEqual([]);

    // La sessione e chiusa: l'area clienti riporta ad accedi
    await page.goto("/it/area-clienti");
    await expect(page).toHaveURL(/\/it\/accedi$/);

    // L'altro utente non e stato toccato
    expect(await findUserId(admin, EMAIL_B)).toBe(userB);
  });

  test("sessione ancora valida di un account eliminato: va ad accedi, senza cicli di redirect", async ({ browser }) => {
    const email = "pf-test+area-c@example.invalid";
    await purgeUser(admin, email);
    await createTestUser(admin, email, "Test Area C");
    try {
      const page = await login(browser, email);
      // L'account sparisce (es. eliminato da un altro dispositivo) ma il token nel cookie vale ancora.
      await purgeUser(admin, email);
      await page.goto("/it/area-clienti");
      await expect(page).toHaveURL(/\/it\/accedi$/);
      await expect(page.locator('input[name="email"]')).toBeVisible();
    } finally {
      await purgeUser(admin, email);
    }
  });

  test("nessun utente di prova residuo dopo la pulizia", async () => {
    await purgeUser(admin, EMAIL_B);
    expect(await countLeftoverTestUsers(admin)).toBe(0);
  });
});
