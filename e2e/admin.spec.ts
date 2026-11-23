import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

// Pannello admin (F1.9). Test con il database REALE: servono E2E_WITH_SUPABASE=1 e le variabili Supabase
// (docker compose --profile e2e run --rm -e E2E_WITH_SUPABASE=1 e2e).
// Creano due utenti di prova (pf-test+admin@ e pf-test+cliente@example.invalid), una richiesta con un file,
// eventi e foto di prova; il ruolo admin si assegna con la chiave segreta, la sessione si ottiene con
// generateLink + /auth/confirm. In afterAll si cancella tutto (utenti, richieste, eventi, foto, oggetti Storage)
// e si ripristinano i testi modificati.

const withSupabase = process.env.E2E_WITH_SUPABASE === "1";

const clean = (value?: string) => value?.trim().replace(/^(["'])(.*)\1$/, "$2").trim() || undefined;
const supabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const publishableKey = clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const secretKey = clean(process.env.SUPABASE_SECRET_KEY);
const baseURL = process.env.BASE_URL || "http://localhost:3000";

const ADMIN_EMAIL = "pf-test+admin@example.invalid";
const CUSTOMER_EMAIL = "pf-test+cliente@example.invalid";
const RUN = Date.now().toString(36);
const TEXT_KEY = "events.intro";
const FILE_CONTENT = `contenuto di prova ${RUN}`;
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const state = {
  adminId: "",
  customerId: "",
  requestId: "",
  requestCode: "",
  fileId: 0,
  portfolioPaths: [] as string[],
  originalTexts: [] as { key: string; locale: string; value: string }[],
};

let api: SupabaseClient;

async function removeStorageFolder(bucket: string, folder: string) {
  const { data } = await api.storage.from(bucket).list(folder);
  if (data?.length) await api.storage.from(bucket).remove(data.map((f) => `${folder}/${f.name}`));
}

/** Svuota le chiavi di cache Upstash dei contenuti toccati dai test (se Upstash è configurato). */
async function purgeCache() {
  const url = clean(process.env.UPSTASH_REDIS_REST_URL)?.replace(/\/$/, "");
  const token = clean(process.env.UPSTASH_REDIS_REST_TOKEN);
  if (!url || !token) return;
  const today = new Date().toISOString().slice(0, 10);
  const keys = ["pf:texts:it", "pf:texts:en", "pf:portfolio:published", `pf:events:upcoming:${today}`];
  await Promise.all(
    keys.map((key) => fetch(`${url}/del/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null)),
  );
}

async function cleanup() {
  // SOLO i due indirizzi esatti di questo test: altri blocchi usano altri utenti `pf-test+...` nello stesso
  // database e non vanno toccati (né qui né nelle verifiche).
  const mine = new Set([ADMIN_EMAIL, CUSTOMER_EMAIL]);
  const { data: list } = await api.auth.admin.listUsers({ perPage: 1000 });
  const ids = (list?.users ?? []).filter((u) => u.email !== undefined && mine.has(u.email)).map((u) => u.id);
  if (ids.length > 0) {
    const { data: requests } = await api.from("requests").select("id").in("customer_id", ids);
    for (const r of requests ?? []) await removeStorageFolder("request-files", r.id);
    // Cancellare le richieste elimina a cascata storico, file, messaggi, notifiche e coda di invio.
    await api.from("requests").delete().in("customer_id", ids);

    const { data: photos } = await api.from("portfolio_items").select("image_path").in("created_by", ids);
    const paths = [...(photos ?? []).map((p) => p.image_path), ...state.portfolioPaths];
    if (paths.length) await api.storage.from("portfolio").remove(paths);
    await api.from("portfolio_items").delete().in("created_by", ids);

    for (const id of ids) await api.auth.admin.deleteUser(id);
  }
  await api.from("events").delete().like("source_code", "pf-test-evento-%");

  // Testi: ripristina i valori originali della chiave usata dai test.
  await api.from("site_texts").delete().eq("key", TEXT_KEY);
  if (state.originalTexts.length > 0) await api.from("site_texts").insert(state.originalTexts);
  await purgeCache();
}

async function login(browser: Browser, email: string): Promise<BrowserContext> {
  const { data, error } = await api.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) throw new Error(`generateLink: ${error?.message}`);
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  const redirect = encodeURIComponent("/it/area-clienti");
  await page.goto(`/auth/confirm?token_hash=${data.properties.hashed_token}&type=magiclink&redirect_to=${redirect}`);
  await page.close();
  return context;
}

/** Client Supabase con la sessione dell'utente (per verificare la RLS dal suo punto di vista). */
async function apiAs(email: string): Promise<SupabaseClient> {
  const { data } = await api.auth.admin.generateLink({ type: "magiclink", email });
  const client = createClient(supabaseUrl!, publishableKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.verifyOtp({ type: "magiclink", token_hash: data.properties!.hashed_token });
  if (error) throw new Error(`verifyOtp: ${error.message}`);
  return client;
}

/** Pagina caricata e moduli con JavaScript pronti: prima di allora un clic salterebbe conferme e invio via Server Action. */
async function settled(page: Page) {
  await page.waitForLoadState("load");
  await page.waitForFunction(
    () => Array.from(document.querySelectorAll("form[data-client-form]")).every((f) => f.hasAttribute("data-hydrated")),
    undefined,
    { timeout: 90_000 },
  );
}

async function openAdmin(context: BrowserContext, path: string): Promise<Page> {
  const page = await context.newPage();
  page.on("dialog", (dialog) => void dialog.accept());
  await page.goto(path);
  await settled(page);
  return page;
}

// Prima prova: non richiede il database. Senza sessione /admin porta sempre alla pagina di accesso.
test("/it/admin senza sessione porta ad accedi", async ({ page }) => {
  test.setTimeout(120_000); // il primo accesso a una rotta con il server di sviluppo compila la pagina
  await page.goto("/it/admin");
  await expect(page).toHaveURL(/\/it\/accedi$/);
  await page.goto("/en/admin/richieste");
  await expect(page).toHaveURL(/\/en\/accedi$/);
});

test.describe("pannello admin (con database)", () => {
  test.skip(!withSupabase, "serve Supabase reale: E2E_WITH_SUPABASE=1");
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  let adminCtx: BrowserContext;
  let customerCtx: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    if (!supabaseUrl || !publishableKey || !secretKey) throw new Error("Variabili Supabase mancanti");
    api = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // Testi originali, da ripristinare in afterAll (la pulizia prima di partire non deve perderli).
    const { data: texts } = await api.from("site_texts").select("key, locale, value").eq("key", TEXT_KEY);
    state.originalTexts = texts ?? [];
    await cleanup();

    const admin = await api.auth.admin.createUser({
      email: ADMIN_EMAIL,
      email_confirm: true,
      user_metadata: { full_name: "PF Test Admin" },
    });
    const customer = await api.auth.admin.createUser({
      email: CUSTOMER_EMAIL,
      email_confirm: true,
      user_metadata: { full_name: "PF Test Cliente", phone: "+39 000 000 0000" },
    });
    if (admin.error || customer.error) throw new Error(`createUser: ${admin.error?.message ?? customer.error?.message}`);
    state.adminId = admin.data.user.id;
    state.customerId = customer.data.user.id;
    const promoted = await api.from("profiles").update({ role: "admin" }).eq("id", state.adminId);
    if (promoted.error) throw new Error(`ruolo admin: ${promoted.error.message}`);

    const { data: line } = await api.from("business_lines").select("id").eq("slug", "moto-bici").single();
    const { data: request, error } = await api
      .from("requests")
      .insert({
        customer_id: state.customerId,
        business_line_id: line!.id,
        description: `Richiesta di test pannello admin ${RUN}`,
        measures: "100 x 50 mm",
        source: `pf-test-fonte-${RUN}`,
        details: { marca: "MarcaTest", uso: "pista", anno: 2020 },
        privacy_consent_at: new Date().toISOString(),
      })
      .select("id, public_code")
      .single();
    if (error) throw new Error(`richiesta di prova: ${error.message}`);
    state.requestId = request.id;
    state.requestCode = request.public_code;

    const path = `${state.requestId}/pf-test.txt`;
    const upload = await api.storage.from("request-files").upload(path, Buffer.from(FILE_CONTENT), { contentType: "text/plain" });
    if (upload.error) throw new Error(`file di prova: ${upload.error.message}`);
    const { data: file, error: fileError } = await api
      .from("request_files")
      .insert({
        request_id: state.requestId,
        storage_path: path,
        original_name: "pf-test.txt",
        size_bytes: FILE_CONTENT.length,
        mime_type: "text/plain",
        uploaded_by: state.customerId,
      })
      .select("id")
      .single();
    if (fileError) throw new Error(`riga del file: ${fileError.message}`);
    state.fileId = file.id;
    // Gli eventi per le email creati dai trigger non devono arrivare a nessun processore (indirizzi veri dei soci)
    await api.from("notification_outbox").delete().eq("request_id", state.requestId);

    adminCtx = await login(browser, ADMIN_EMAIL);
    customerCtx = await login(browser, CUSTOMER_EMAIL);
  });

  // Gli eventi in coda per le email (outbox) dei test non devono mai essere spediti: si tolgono dopo ogni prova
  // (e subito dopo la creazione della richiesta). Le notifiche in-app per gli admin restano: le verifica l'ultimo test.
  test.afterEach(async () => {
    if (state.requestId) await api.from("notification_outbox").delete().eq("request_id", state.requestId);
  });

  test.afterAll(async () => {
    await adminCtx?.close();
    await customerCtx?.close();
    if (api) await cleanup();
  });

  test("il cliente non entra nel pannello: 403 su pagine e route, e il database rifiuta le scritture admin", async ({ browser }) => {
    const page = await customerCtx.newPage();
    const response = await page.goto("/it/admin");
    expect(response?.status()).toBe(403);
    expect((await page.goto("/it/admin/richieste"))?.status()).toBe(403);

    // Route Handler: ricontrollano il ruolo da soli
    const file = await customerCtx.request.get(`/it/admin/richieste/${state.requestId}/file/${state.fileId}`, { maxRedirects: 0 });
    expect(file.status()).toBe(403);
    const qr = await customerCtx.request.get("/it/admin/eventi/1/qr");
    expect(qr.status()).toBe(403);
    // Senza sessione: 401
    const anonCtx = await browser.newContext({ baseURL });
    expect((await anonCtx.request.get("/it/admin/eventi/1/qr")).status()).toBe(401);
    await anonCtx.close();
    await page.close();

    // Seconda barriera: anche chiamando il database direttamente con la sessione del cliente, niente da fare.
    const asCustomer = await apiAs(CUSTOMER_EMAIL);
    const rpc = await asCustomer.rpc("change_request_status", { p_request_id: state.requestId, p_status: "chiuso" });
    expect(rpc.error?.code).toBe("42501");
    const text = await asCustomer.from("site_texts").upsert({ key: TEXT_KEY, locale: "it", value: "hack" }, { onConflict: "key,locale" });
    expect(text.error).not.toBeNull();
    const internal = await asCustomer
      .from("request_messages")
      .insert({ request_id: state.requestId, author_id: state.customerId, body: "finta nota", internal: true });
    expect(internal.error).not.toBeNull();
    const upload = await asCustomer.storage.from("portfolio").upload(`pf-test-${RUN}.png`, PNG_1X1, { contentType: "image/png" });
    expect(upload.error).not.toBeNull();
    const role = await asCustomer.from("profiles").update({ role: "admin" }).eq("id", state.customerId);
    expect(role.error).not.toBeNull();
  });

  test("dashboard: conteggi per stato, ultime richieste e file in attesa di copia", async () => {
    const page = await openAdmin(adminCtx, "/it/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await expect(page.getByTestId("count-richiesta")).toBeVisible();
    await expect(page.getByRole("link", { name: state.requestCode }).first()).toBeVisible();
    await expect(page.getByTestId("pending-files")).toContainText("pf-test.txt");
    await page.close();
  });

  test("elenco richieste: filtri per stato, fonte e testo", async () => {
    const page = await openAdmin(adminCtx, `/it/admin/richieste?fonte=pf-test-fonte-${RUN}&stato=richiesta`);
    await expect(page.getByTestId("requests-table")).toContainText(state.requestCode);

    await page.goto(`/it/admin/richieste?q=${RUN}&linea=moto-bici&tipo=interesse`);
    await expect(page.getByTestId("requests-table")).toContainText(state.requestCode);

    await page.goto(`/it/admin/richieste?q=${RUN}&stato=chiuso`);
    await expect(page.getByText("Nessuna richiesta corrisponde ai filtri.")).toBeVisible();

    // Caratteri speciali nel testo libero non rompono la ricerca
    const weird = await page.goto("/it/admin/richieste?q=%2C%29%28%25%27%22");
    expect(weird?.status()).toBe(200);
    await page.close();
  });

  test("dettaglio richiesta: dati cliente, campi con etichette, file e download con URL firmato breve", async () => {
    const page = await openAdmin(adminCtx, `/it/admin/richieste/${state.requestId}`);
    await expect(page.getByTestId("request-code")).toHaveText(state.requestCode);
    await expect(page.getByTestId("request-customer")).toContainText("PF Test Cliente");
    await expect(page.getByTestId("request-customer")).toContainText(CUSTOMER_EMAIL);
    await expect(page.getByTestId("request-customer")).toContainText("+39 000 000 0000");
    // campi dinamici con le etichette della schema (non le chiavi) e le opzioni leggibili
    const details = page.getByTestId("request-details");
    await expect(details).toContainText("Marca");
    await expect(details).toContainText("MarcaTest");
    await expect(details).toContainText("Pista");
    await expect(page.getByTestId("request-files")).toContainText("pf-test.txt");

    // Download: redirect a un URL firmato che scade (parametro token) e contiene il file
    const href = await page.getByTestId("download-file").getAttribute("href");
    const response = await adminCtx.request.get(href!, { maxRedirects: 0 });
    expect(response.status()).toBe(303);
    const location = response.headers()["location"];
    expect(location).toContain("/storage/v1/object/sign/request-files/");
    expect(location).toContain("token=");
    expect(response.headers()["cache-control"]).toBe("no-store");
    const content = await fetch(location);
    expect(await content.text()).toBe(FILE_CONTENT);

    // Un file di un'altra richiesta non si scarica passando l'id sbagliato
    const wrong = await adminCtx.request.get(`/it/admin/richieste/00000000-0000-4000-8000-000000000000/file/${state.fileId}`, { maxRedirects: 0 });
    expect(wrong.status()).toBe(404);
    await page.close();
  });

  test("cambio stato con nota: lo storico mostra il cambio e la nota", async () => {
    const note = `Nota di cambio stato ${RUN}`;
    const page = await openAdmin(adminCtx, `/it/admin/richieste/${state.requestId}`);
    const form = page.getByTestId("status-form");
    await form.locator('select[name="status"]').selectOption("in_valutazione");
    await form.locator('textarea[name="note"]').fill(note);
    await form.getByRole("button", { name: "Salva stato" }).click();
    await expect(form.getByRole("status")).toHaveText("Stato aggiornato.");
    // Dopo il salvataggio la pagina mostra lo stato nuovo e il campo propone lo stato appena salvato (non quello vecchio)
    await expect(page.getByTestId("request-code").locator("xpath=following-sibling::span[1]")).toHaveText("In valutazione");
    await expect(form.locator('select[name="status"]')).toHaveValue("in_valutazione");

    await expect(page.getByTestId("history-note").filter({ hasText: note })).toBeVisible();
    await expect(page.getByTestId("request-history")).toContainText("Richiesta ricevuta → In valutazione");

    const { data: history } = await api
      .from("request_status_history")
      .select("to_status, note, changed_by")
      .eq("request_id", state.requestId)
      .order("id", { ascending: false })
      .limit(1);
    expect(history?.[0]).toMatchObject({ to_status: "in_valutazione", note, changed_by: state.adminId });

    // Stesso stato: errore chiaro, nessun nuovo storico
    await form.getByRole("button", { name: "Salva stato" }).click();
    await expect(form.getByRole("alert")).toHaveText("La richiesta è già in questo stato.");
    await page.close();
  });

  test("nota interna: l'admin la vede, il cliente no; il messaggio pubblico lo vede", async () => {
    const internal = `Nota interna segreta ${RUN}`;
    const publicText = `Messaggio al cliente ${RUN}`;
    const page = await openAdmin(adminCtx, `/it/admin/richieste/${state.requestId}`);
    const form = page.getByTestId("message-form");

    await form.locator('textarea[name="body"]').fill(internal);
    await form.getByLabel("Nota interna (solo soci, il cliente NON la vede)").check();
    await form.getByRole("button", { name: "Invia" }).click();
    await expect(form.getByRole("status")).toHaveText("Nota interna salvata.");

    await form.locator('textarea[name="body"]').fill(publicText);
    await form.getByLabel("Messaggio al cliente (visibile nell'area clienti)").check();
    await form.getByRole("button", { name: "Invia" }).click();
    await expect(form.getByRole("status")).toHaveText("Messaggio inviato al cliente.");

    const messages = page.getByTestId("request-messages");
    await expect(messages.locator('[data-internal="true"]')).toContainText(internal);
    await expect(messages.locator('[data-internal="false"]')).toContainText(publicText);
    await page.close();

    // Dal punto di vista del cliente (RLS): vede il pubblico, non vede l'interna
    const asCustomer = await apiAs(CUSTOMER_EMAIL);
    const { data } = await asCustomer.from("request_messages").select("body, internal").eq("request_id", state.requestId);
    const bodies = (data ?? []).map((m) => m.body);
    expect(bodies).toContain(publicText);
    expect(bodies).not.toContain(internal);
    expect((data ?? []).every((m) => m.internal === false)).toBe(true);
    // e nello storico stati il cliente vede lo stato ma la nota resta leggibile solo se lo stato è visibile (qui lo è)
    const { data: history } = await asCustomer.from("request_status_history").select("to_status").eq("request_id", state.requestId);
    expect((history ?? []).length).toBeGreaterThanOrEqual(2);
  });

  test("testi: la modifica si vede subito sul sito pubblico", async ({ browser }) => {
    const newText = `Introduzione di prova ${RUN}`;
    const page = await openAdmin(adminCtx, `/it/admin/contenuti/testi?q=${TEXT_KEY}`);
    const row = page.locator(`[data-testid="text-row"][data-key="${TEXT_KEY}"]`);
    await row.locator('textarea[name="value_it"]').fill(newText);
    await row.getByRole("button", { name: "Salva", exact: true }).click();
    await expect(row.getByRole("status")).toContainText("Testo salvato");

    const publicCtx = await browser.newContext({ baseURL });
    const publicPage = await publicCtx.newPage();
    await publicPage.goto("/it/eventi");
    await expect(publicPage.getByText(newText)).toBeVisible();
    await publicCtx.close();
    await page.close();
  });

  test("eventi: crea, il codice fonte nasce dal titolo, QR scaricabile in SVG e PNG", async () => {
    const title = `PF Test Evento ${RUN}`;
    const code = `pf-test-evento-${RUN}`;
    const page = await openAdmin(adminCtx, "/it/admin/eventi");

    await page.getByLabel("Titolo (italiano)").fill(title);
    await expect(page.getByLabel("Codice fonte")).toHaveValue(code);
    await page.getByLabel("Data di inizio").fill("2027-06-01");
    await page.getByRole("button", { name: "Crea evento" }).click();
    await page.waitForURL(/\/it\/admin\/eventi\/\d+/);
    await settled(page);

    const { data: created } = await api.from("events").select("id, source_code, published").eq("source_code", code).single();
    expect(created).toMatchObject({ source_code: code, published: false });

    await expect(page.getByTestId("qr-url")).toHaveText(new RegExp(`/it/lista-interesse\\?fonte=${code}$`));
    await expect(page.getByTestId("qr-preview")).toBeVisible();

    const [svgDownload] = await Promise.all([page.waitForEvent("download"), page.getByTestId("qr-svg").click()]);
    expect(svgDownload.suggestedFilename()).toBe(`qr-${code}-it.svg`);
    const svg = readFileSync(await svgDownload.path(), "utf8");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("</svg>");

    const [pngDownload] = await Promise.all([page.waitForEvent("download"), page.getByTestId("qr-png").click()]);
    expect(pngDownload.suggestedFilename()).toBe(`qr-${code}-it.png`);
    const png = readFileSync(await pngDownload.path());
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");

    // La versione inglese cambia l'indirizzo del QR
    await page.getByRole("link", { name: "Inglese" }).click();
    await expect(page.getByTestId("qr-url")).toHaveText(new RegExp(`/en/lista-interesse\\?fonte=${code}$`));

    // L'indirizzo del QR porta davvero al modulo
    const target = await page.request.get(`/it/lista-interesse?fonte=${code}`);
    expect(target.status()).toBe(200);

    // Un secondo evento con lo stesso titolo: il codice proposto è già usato (errore chiaro);
    // lasciandolo vuoto il server ne genera uno unico (-2)
    await page.goto("/it/admin/eventi");
    await settled(page);
    const newForm = page.getByTestId("event-form");
    await newForm.getByLabel("Titolo (italiano)").fill(title);
    await newForm.getByLabel("Data di inizio").fill("2027-06-02");
    await newForm.getByRole("button", { name: "Crea evento" }).click();
    await expect(newForm.getByRole("alert")).toContainText("già usato");
    await newForm.getByLabel("Codice fonte").fill("");
    await newForm.getByRole("button", { name: "Crea evento" }).click();
    await page.waitForURL(/\/it\/admin\/eventi\/\d+/);
    await expect(page.getByLabel("Codice fonte")).toHaveValue(`${code}-2`);

    // Il codice si può modificare, ma non duplicare
    const eventForm = page.getByTestId("event-form");
    await eventForm.getByLabel("Codice fonte").fill(code);
    await eventForm.getByRole("button", { name: "Salva evento" }).click();
    await expect(eventForm.getByRole("alert")).toContainText("già usato");
    await eventForm.getByLabel("Codice fonte").fill(`${code}-manuale`);
    await eventForm.getByRole("button", { name: "Salva evento" }).click();
    await expect(eventForm.getByRole("status")).toHaveText("Evento salvato.");
    await page.close();
  });

  test("portfolio: carica una foto, la pubblicazione richiede i diritti, elimina con conferma", async () => {
    const caption = `pf-test didascalia ${RUN}`;
    const page = await openAdmin(adminCtx, "/it/admin/portfolio");

    const upload = page.getByTestId("portfolio-upload");
    await upload.getByLabel("Immagine").setInputFiles({ name: "pf-test.png", mimeType: "image/png", buffer: PNG_1X1 });
    await upload.getByLabel("Didascalia (italiano)").fill(caption);
    await upload.getByRole("button", { name: "Carica" }).click();
    await expect(upload.getByRole("status")).toHaveText("Foto aggiunta al portfolio.", { timeout: 60_000 });

    const item = page.getByTestId("portfolio-item").filter({ has: page.locator(`input[value="${caption}"]`) });
    await expect(item).toHaveCount(1);
    const { data: row } = await api.from("portfolio_items").select("id, image_path, published, rights_transferred").eq("created_by", state.adminId).single();
    expect(row).toMatchObject({ published: false, rights_transferred: false });
    // Anche se il test si ferma a metà, la pulizia toglie questo file dallo Storage
    state.portfolioPaths.push(row!.image_path);

    // Pubblicare senza diritti: il database rifiuta e il pannello lo spiega
    await item.getByLabel("Pubblicata sul sito").check();
    await item.getByRole("button", { name: "Salva" }).click();
    await expect(item.getByRole("alert")).toContainText("senza i diritti ceduti");

    // Con i diritti si pubblica
    await item.getByLabel("Diritti ceduti alla società").check();
    await item.getByRole("button", { name: "Salva" }).click();
    await expect(item.getByRole("status")).toHaveText("Modifiche salvate.");
    const { data: published } = await api.from("portfolio_items").select("published, rights_transferred").eq("id", row!.id).single();
    expect(published).toEqual({ published: true, rights_transferred: true });

    // Elimina: riga e file
    await item.getByRole("button", { name: "Elimina" }).click();
    await expect(page.getByTestId("portfolio-item").filter({ has: page.locator(`input[value="${caption}"]`) })).toHaveCount(0, { timeout: 30_000 });
    const { count } = await api.from("portfolio_items").select("id", { count: "exact", head: true }).eq("id", row!.id);
    expect(count).toBe(0);
    const { data: files } = await api.storage.from("portfolio").list("", { search: row!.image_path });
    expect(files ?? []).toHaveLength(0);
    await page.close();
  });

  test("contenuti: interruttore preventivi con conferma, editor della form_schema con validazione", async () => {
    const page = await adminCtx.newPage();
    await page.goto("/it/admin/contenuti/visibilita");
    await settled(page);
    const before = (await api.from("site_settings").select("value").eq("key", "quote_mode").single()).data?.value;

    // Conferma rifiutata: nessun cambiamento
    page.once("dialog", (dialog) => void dialog.dismiss());
    await page.getByTestId("quote-mode").getByRole("button").click();
    await page.waitForTimeout(1000);
    expect((await api.from("site_settings").select("value").eq("key", "quote_mode").single()).data?.value).toBe(before);

    // Editor: JSON rotto -> errori e pulsante spento; schema valida -> salva
    await page.goto("/it/admin/contenuti/moduli?linea=riciclo");
    await settled(page);
    const editor = page.getByTestId("schema-form");
    await editor.locator('textarea[name="schema"]').fill('[{"key":"Marca","type":"boh","label_it":"","extra":1}]');
    await expect(page.getByTestId("schema-issues")).toContainText("chiave non valida");
    await expect(page.getByTestId("schema-issues")).toContainText("tipo non valido");
    await expect(page.getByTestId("schema-issues")).toContainText("etichetta mancante");
    await expect(page.getByTestId("schema-issues")).toContainText("proprietà non ammessa");
    await expect(editor.getByRole("button", { name: "Salva schema" })).toBeDisabled();

    await editor.locator('textarea[name="schema"]').fill("[]");
    await expect(page.getByTestId("schema-status")).toContainText("Struttura valida: 0 campi.");
    await expect(editor.getByRole("button", { name: "Salva schema" })).toBeEnabled();
    await editor.getByRole("button", { name: "Salva schema" }).click();
    await expect(editor.getByRole("status")).toHaveText("Schema salvato.");
    await page.close();
  });

  test("utenti: elenco con email, cambio ruolo con conferma e ritorno", async () => {
    const page = await openAdmin(adminCtx, "/it/admin/utenti");
    const row = page.getByTestId("user-row").filter({ hasText: CUSTOMER_EMAIL });
    await expect(row).toHaveCount(1);
    await expect(page.getByTestId("user-row").filter({ hasText: ADMIN_EMAIL })).toContainText("tu");

    // Il messaggio «Ruolo aggiornato.» del primo cambio resta a video: si aspetta il database, non il messaggio.
    const roleInDb = async () => (await api.from("profiles").select("role").eq("id", state.customerId).single()).data?.role;

    await row.locator('select[name="role"]').selectOption("operatore");
    await row.getByRole("button", { name: "Applica" }).click();
    await expect(row.getByRole("status")).toHaveText("Ruolo aggiornato.");
    await expect.poll(roleInDb, { timeout: 30_000 }).toBe("operatore");

    await row.locator('select[name="role"]').selectOption("cliente");
    await row.getByRole("button", { name: "Applica" }).click();
    await expect.poll(roleInDb, { timeout: 30_000 }).toBe("cliente");
    await expect(row.getByRole("status")).toHaveText("Ruolo aggiornato.");

    await page.close();
  });

  test("notifiche: la campanella riceve le righe create dai trigger e si possono segnare come lette", async () => {
    // Nessuna riga inserita a mano: la richiesta (beforeAll) ha già creato `request_created` per l'admin di prova;
    // un messaggio e un file del cliente, scritti con la SUA sessione, fanno scattare gli altri due trigger.
    const asCustomer = await apiAs(CUSTOMER_EMAIL);
    const message = await asCustomer
      .from("request_messages")
      .insert({ request_id: state.requestId, author_id: state.customerId, body: `Domanda del cliente ${RUN}` });
    expect(message.error).toBeNull();
    const file = await asCustomer.from("request_files").insert({
      request_id: state.requestId,
      storage_path: `${state.requestId}/pf-test-2.txt`,
      original_name: "pf-test-2.txt",
      size_bytes: 10,
      mime_type: "text/plain",
      uploaded_by: state.customerId,
    });
    expect(file.error).toBeNull();

    const { data: rows } = await api
      .from("notifications")
      .select("kind, payload, read_at")
      .eq("user_id", state.adminId)
      .eq("request_id", state.requestId);
    const kinds = (rows ?? []).map((r) => r.kind);
    expect(kinds).toEqual(expect.arrayContaining(["request_created", "message_from_customer", "file_uploaded"]));
    expect((rows ?? []).find((r) => r.kind === "request_created")?.payload).toMatchObject({ public_code: state.requestCode });

    const { count } = await api
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", state.adminId)
      .is("read_at", null);
    expect(count).toBeGreaterThanOrEqual(3);

    const page = await openAdmin(adminCtx, "/it/admin");
    const unreadNow = async () => Number(await page.getByTestId("notification-bell").getAttribute("data-unread"));
    const before = await unreadNow();
    expect(before).toBeGreaterThanOrEqual(count!);
    await expect(page.getByTestId("notification-bell")).toHaveAccessibleName(`Notifiche: ${before} non lette`);

    await page.goto("/it/admin/notifiche");
    await settled(page);
    const list = page.getByTestId("notifications-list");
    await expect(list).toContainText(`Nuova richiesta ${state.requestCode}`);
    await expect(list).toContainText(`Nuovo messaggio del cliente sulla richiesta ${state.requestCode}`);
    await expect(list).toContainText(`Nuovo file caricato sulla richiesta ${state.requestCode}`);

    // Il link della notifica porta al dettaglio della richiesta
    await list.getByRole("link", { name: `Nuova richiesta ${state.requestCode}` }).click();
    await page.waitForURL(new RegExp(`/it/admin/richieste/${state.requestId}$`));
    await expect(page.getByTestId("request-code")).toHaveText(state.requestCode);
    await page.goBack();
    await settled(page);

    await list.locator('li[data-unread="true"]').first().getByRole("button", { name: "Segna come letta" }).click();
    await expect.poll(unreadNow, { timeout: 30_000 }).toBeLessThan(before);

    await page.getByRole("button", { name: "Segna tutte come lette" }).click();
    await expect(page.getByTestId("notification-bell")).toHaveAttribute("data-unread", "0", { timeout: 30_000 });
    const { count: left } = await api
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", state.adminId)
      .is("read_at", null);
    expect(left).toBe(0);
    await page.close();
  });
});
