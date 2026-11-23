# Primefactory

Piattaforma web di Primefactory: laboratorio di stampa 3D, accessori per moto e gioielleria.
Le decisioni di progetto sono in [`docs/decisioni-grilling.md`](docs/decisioni-grilling.md),
il piano di lavoro in [`docs/backlog.md`](docs/backlog.md).

Stack: Next.js (App Router, TypeScript), Tailwind + shadcn/ui, next-intl (it/en),
Supabase (`@supabase/ssr`), produzione su Cloudflare Workers con OpenNext.

## Regola base: tutto gira in Docker

Sul tuo computer **non** si installa Node, npm o altro. Ogni comando di sviluppo
gira in un container, cosi l'ambiente e uguale per tutti e si ricrea in un minuto.
Serve solo **Docker Desktop** acceso.

## Primo avvio

1. Copia il file delle variabili e compilalo (vedi sezione sotto):

   ```bash
   cp .env.example .env.local
   ```

   Il sito parte anche senza valori: le funzioni che usano Supabase restano
   semplicemente inattive.

2. Installa le dipendenze (si fa una volta, o quando cambia `package.json`).
   Vanno nel volume Docker `node_modules`, non sul tuo disco:

   ```bash
   docker compose run --rm app npm ci
   ```

3. Avvia il sito:

   ```bash
   docker compose up
   ```

   Apri <http://localhost:3000> (ti porta su `/it`; la versione inglese e su `/en`).
   Il container ha un controllo di salute (`healthcheck`): con
   `docker compose ps` vedrai `healthy` quando il sito risponde.

4. Per spegnere: `Ctrl+C`, poi `docker compose down`.

## Comandi utili

Tutti si lanciano nel container. Forma generale:
`docker compose run --rm app <comando>`.

| Cosa | Comando |
|------|---------|
| Controllo stile del codice (lint) | `docker compose run --rm app npm run lint` |
| Controllo dei tipi TypeScript | `docker compose run --rm app npx tsc --noEmit` |
| Test unitari (Vitest) | `docker compose run --rm app npx vitest run` |
| Build di produzione | `docker compose run --rm app npm run build` |
| Build per Cloudflare (OpenNext) | `docker compose run --rm app npx opennextjs-cloudflare build` |
| Test end-to-end (Playwright) | `docker compose --profile e2e run --rm e2e` |
| Aggiungere un pacchetto | `docker compose run --rm app npm install <nome>` |
| Aggiungere un componente shadcn | `docker compose run --rm app npx shadcn@latest add <nome>` |

Il test end-to-end avvia da solo il servizio `app`, aspetta che sia `healthy`
e poi esegue `e2e/smoke.spec.ts` con i browser inclusi nell'immagine Playwright.

Su Windows, in Git Bash, se un comando con percorsi si comporta in modo strano
anteponi `MSYS_NO_PATHCONV=1`.

## Struttura delle cartelle

```
.
├── docker-compose.yml     servizio app (sviluppo) e profilo e2e (Playwright)
├── Dockerfile.dev         immagine Node 22 per lo sviluppo
├── src/
│   ├── app/[locale]/      pagine; [locale] e "it" o "en"
│   ├── components/ui/     componenti shadcn/ui
│   ├── components/site/   header, footer, selettore lingua, griglie del sito pubblico
│   ├── i18n/              configurazione next-intl (lingue, routing, messaggi)
│   ├── lib/content/       strato dati del sito pubblico (solo server) e cache Redis
│   ├── lib/notify/        notifiche: processore dell'outbox, template email IT/EN, Resend, Telegram (solo server)
│   ├── lib/supabase/      client Supabase: browser, server, refresh sessione, tipi generati
│   └── proxy.ts           unisce next-intl e sessione Supabase
├── messages/              testi tradotti: it.json, en.json
├── e2e/                   test Playwright
├── tests/unit/            test Vitest
├── tests/integration/     test Vitest con il database reale (solo con E2E_WITH_SUPABASE=1)
├── supabase/              config.toml e migrazioni (supabase/migrations)
├── ops/keepalive-worker/  Worker Cloudflare che tiene sveglio Supabase
├── .github/workflows/     CI (ci.yml) e deploy (deploy.yml)
├── wrangler.jsonc         configurazione Cloudflare Workers
└── open-next.config.ts    configurazione OpenNext
```

Per aggiungere una lingua (es. francese): aggiungi `"fr"` in `src/i18n/routing.ts`
e crea `messages/fr.json` con le stesse chiavi di `it.json`.

## Variabili d'ambiente: dove vanno

- **In locale**: nel file `.env.local` (mai committato, e nel `.gitignore`).
  Il file `.env.example` elenca solo i *nomi*: copialo e riempi i valori.
  Docker Compose lo passa al container da solo.
- **Variabili `NEXT_PUBLIC_*`**: finiscono nel browser, quindi devono contenere solo
  valori pubblici (URL Supabase, chiave pubblicabile, site key Turnstile).
- **Segreti** (`SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, token vari): solo lato server,
  mai in `NEXT_PUBLIC_*`, mai nel codice.
- **GitHub Actions**: secret `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`
  (Settings > Secrets and variables > Actions) per il deploy; le variabili
  pubbliche `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  come *Variables* dello stesso pannello. Se i secret mancano, il job di deploy
  si ferma senza errori.
- **Cloudflare Workers (produzione)**: variabili e segreti del Worker
  `pf-primefactory` dal pannello Cloudflare o con `wrangler secret put`.

## Sito pubblico: contenuti, cache e SEO

- I testi, le linee, le pagine, il portfolio, gli eventi e i documenti legali si leggono
  da Supabase con la chiave pubblicabile (la protezione e la RLS). Il codice e in
  `src/lib/content/` e gira solo sul server.
- `getSiteTexts(lingua)` ricade sull'italiano e poi su `content/site-texts.json` se il
  database non risponde.
- Cache con Upstash Redis (Q17): 300 secondi, attiva solo se ci sono
  `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`; se Redis non risponde la pagina
  si carica comunque. `invalidateCache(prefisso)` svuota le chiavi dopo una modifica
  dal pannello. Le pagine sono `force-dynamic` (Cache Components non e usabile con OpenNext).
- `NEXT_PUBLIC_SITE_URL` e l'indirizzo pubblico (canonical, hreflang, sitemap). Se manca
  si usa `http://localhost:3000`. In produzione va definita come variabile **di build**
  (e letta a ogni build di `opennextjs-cloudflare`); `UPSTASH_*` sono segreti **runtime**
  del Worker (`wrangler secret put`).
- Per provare il Worker in locale, in container: crea un file `.dev.vars` (e nel
  `.gitignore`) con le variabili `UPSTASH_*`, poi
  `docker compose run --rm -p 8788:8788 app npx opennextjs-cloudflare build` e
  `docker compose run --rm -p 8788:8788 app npx wrangler dev --ip 0.0.0.0 --port 8788`.
- Le foto del portfolio sono tag `<img>` e non `next/image`: l'ottimizzazione immagini di
  Next richiederebbe su Cloudflare un binding Images non configurato.
- I testi dell'interfaccia del sito (menu, pulsanti, avvisi) stanno in
  `messages/site.it.json` e `messages/site.en.json`, uniti a `it.json`/`en.json` in
  `src/i18n/request.ts`.

## Database Supabase

La cartella `supabase/` contiene `config.toml`. Le migrazioni SQL versionate vanno in
`supabase/migrations/`. La CLI Supabase si usa in container, per esempio:
`docker compose run --rm app npx supabase --help`.

## CI e deploy

- `ci.yml` (pull request e push su `main`): `npm ci`, lint, tipi, Vitest, build, gitleaks
  (job a parte) e test Playwright.
- `deploy.yml` (push su `main`): build OpenNext e `wrangler deploy` su Cloudflare.

## Note

- Il worker in `ops/keepalive-worker/` non e ancora deployato: vedi il suo README.
- Lo scaffold di Next.js attivava `cacheComponents` e `partialPrefetching`. Su
  Cloudflare/OpenNext davano errore 500 a runtime (provato con `wrangler dev`), quindi in
  `next.config.ts` sono disattivati. Va riprovato quando OpenNext li supportera.
- Il proxy (`src/proxy.ts`, il vecchio middleware) gira su Node: OpenNext avvisa che
  questo supporto e sperimentale. Con `wrangler dev` `/it` e `/en` rispondono 200.
- Il `matcher` di `src/proxy.ts` e scritto come stringa JS con `\.` (che diventa `.`):
  di fatto il proxy gira solo su `/`. Correggerlo in `\\.` farebbe passare anche `/it/...`
  e `/auth/...` da next-intl: da fare insieme alla parte di autenticazione.
- Con la radice dinamica `[locale]`, nel server di sviluppo (`next dev`) la pagina 404
  resta bianca; in produzione (`next start`, Workers) mostra header e footer. Lo status
  e sempre 404.

## Lavorare su più copie in parallelo (worktree)

Se apri una seconda copia del progetto con `git worktree`, evita conflitti così:

```bash
# nella cartella del worktree
export PF_PORT=3001                                         # porta diversa da 3000
export PF_ENV_FILE=/c/Users/<utente>/pf-primefactory/.env.local  # usa il file env del repo principale
docker compose -p pf-wt1 up -d                              # nome progetto Docker diverso
```

## Caricare testi e documenti legali nel database

I testi del sito (`content/site-texts.json`) e le bozze legali (`content/legal/`) si caricano in Supabase con:

```bash
docker compose run --rm --no-deps app node scripts/seed-content.mjs
```

Lo script è idempotente: non sovrascrive i testi già modificati dal pannello admin.

## Modulo lista d'interesse e accesso clienti (F1.6 e F1.7)

Pagine: `/[locale]/lista-interesse` (modulo), `/[locale]/lista-interesse/conferma`, `/[locale]/accedi`
(magic link), `/[locale]/area-clienti` (le proprie richieste). Rotte senza prefisso lingua:
`/auth/confirm` (conferma del link nell'email) e `/auth/logout` (solo POST).

### Come funziona l'invio del modulo

1. Il visitatore compila il modulo. Se la pagina `lista-interesse` non è `attiva` risponde 404.
   `site_settings.quote_mode` decide titoli e tipo salvato: `false` = `interesse`, `true` = `preventivo`.
2. I campi extra arrivano dalla `form_schema` della linea scelta (tipi `text`, `number`, `select`,
   `boolean`, `date`). Il server li ricontrolla: chiavi sconosciute scartate, opzioni non ammesse rifiutate.
3. Controlli anti-spam, in quest'ordine: campo trappola (honeypot), limite per IP (5/ora),
   Cloudflare Turnstile, limite per email (3/giorno). Su Upstash finiscono solo hash SHA-256, non IP né email.
4. Con la chiave segreta il server cerca l'utente per email (funzione SQL `get_user_id_by_email`,
   eseguibile solo da `service_role`); se non c'è lo crea. Il trigger crea il profilo. Poi salva la
   richiesta con consenso privacy (data e versione del documento) e `source` (campo `?fonte=`).
5. Parte il magic link (`signInWithOtp`, `shouldCreateUser: false`) e il visitatore va alla pagina di conferma.
   **La risposta è sempre uguale** per email nuova, già registrata o oltre il limite: nessuno può scoprire
   quali email hanno un account.

Parametri dell'indirizzo: `?fonte=<codice>` (solo `a-z 0-9 -`, 1-80 caratteri, altrimenti ignorato) e
`?linea=<slug>` (preseleziona la linea, ignorato se non è tra quelle attive).

### Variabili d'ambiente del modulo

| Variabile | Dove | Note |
|-----------|------|------|
| `SUPABASE_SECRET_KEY` | `.env.local`; in produzione segreto del Worker | Solo server. Mai `NEXT_PUBLIC_*`. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `.env.local`; variabile di GitHub Actions (build) | Pubblica. Fissata nel codice **alla build**. |
| `TURNSTILE_SECRET_KEY` | `.env.local`; segreto del Worker | Solo server. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | `.env.local`; segreti del Worker | Valori tra virgolette accettati. |

Comportamento se mancano:
- **Sviluppo** (`next dev`): Turnstile usa le chiavi di test ufficiali Cloudflare (sempre superato) e il
  rate limit si disattiva con un avviso nel log.
- **Produzione**: senza chiavi Turnstile o senza Redis l'invio **fallisce con errore esplicito**. Non passa mai in silenzio.

Segreti del Worker: `npx wrangler secret put SUPABASE_SECRET_KEY` (idem per gli altri) dentro il container.

### Impostazioni da cambiare a mano nel pannello Supabase

Il progetto Supabase non si modifica da codice per queste voci. Vanno fatte una volta (e ripetute su un
eventuale secondo progetto). Percorsi del pannello: <https://supabase.com/dashboard/project/wxksoylsvpbkwjfbbvzf>.

**1. Authentication > URL Configuration**
- **Site URL**: l'indirizzo pubblico del sito (finché non c'è il dominio, quello `workers.dev` del Worker).
  Il link nell'email parte da qui.
- **Redirect URLs**: aggiungi `https://<dominio>/**` e, per lo sviluppo, `http://localhost:3000/**` e
  `http://localhost:3012/**`. Se l'indirizzo non è in elenco Supabase lo ignora e usa il Site URL
  (il link funziona lo stesso, ma si perde la lingua e si finisce sempre su `/it`).

**2. Authentication > Emails > Templates: modello "Magic Link"** (e, per sicurezza, "Confirm signup")

Sostituisci `{{ .ConfirmationURL }}` con:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&redirect_to={{ .RedirectTo }}
```

Esempio di corpo completo (bilingue, il modello è unico per tutto il progetto):

```html
<h2>Accedi a Primefactory / Sign in to Primefactory</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&redirect_to={{ .RedirectTo }}">Accedi all'area clienti / Open the client area</a></p>
<p>Se non hai chiesto tu questo link, ignora l'email. / If you did not request this link, ignore this email.</p>
```

Perché così: il flusso classico (PKCE, `?code=`) funziona solo nel browser che ha chiesto il link, perché il
"code verifier" sta lì. Con `token_hash` la conferma avviene sul server e il link si può aprire **anche da un
altro dispositivo** (tipico: richiesta dal PC, email letta dal telefono). È il flusso consigliato dalla
documentazione Supabase per le app con rendering lato server. Il link vale **una volta sola**.

**3. Authentication > Sign In / Providers > Email**
- Consigliato: **disattiva "Allow new users to sign up"**. Gli account li crea solo il server con la chiave
  segreta; così nessuno può registrarsi da solo chiamando l'API con la chiave pubblicabile.
  Il magic link per account esistenti continua a funzionare. Dopo la modifica riprova il flusso (invio modulo, link, accesso).

**4. Authentication > SMTP Settings**
- Il servizio email di prova di Supabase invia pochissime email l'ora e solo ai membri dell'organizzazione.
  Prima del lancio serve un SMTP personalizzato (Resend, già in lista) con il dominio verificato. Senza,
  i clienti **non ricevono** il magic link (la richiesta viene salvata comunque).

**5. Authentication > Rate Limits** (facoltativo): controlla "Rate limit for sending emails" in base al
piano SMTP scelto.

### Primo admin (Q37)

Il ruolo `admin` si assegna solo con la chiave segreta: la RLS impedisce a chiunque di cambiare il proprio.
Dopo che il fondatore ha un account (invia il modulo con la sua email, oppure Supabase > Authentication >
Users > Add user):

```bash
# simulazione: mostra cosa farebbe, non modifica nulla
docker compose run --rm --no-deps app node scripts/promote-admin.mjs fondatore@esempio.it
# applica davvero
docker compose run --rm --no-deps app node scripts/promote-admin.mjs fondatore@esempio.it --yes
```

Lo script non crea utenti e cambia solo `profiles.role`. Il ruolo si legge dal database a ogni richiesta
(mai dai metadata dell'utente, che il client può modificare), quindi vale subito.

### Helper di autenticazione (`src/lib/auth/`)

`getCurrentUser()`, `getCurrentProfile()`, `requireUser(locale)` (senza sessione porta a `/accedi`) e
`requireRole('admin' | 'operatore', locale)` (ruolo insufficiente: 403 con `forbidden()`; `operatore`
è consentito anche agli admin). Usano `getClaims()`, che verifica la firma del token.

### Test del modulo

```bash
docker compose run --rm app npx vitest run                    # unitari (validatori, zod, Turnstile, rate limit, logica di invio)
docker compose --profile e2e run --rm -e E2E_WITH_SUPABASE=1 e2e   # e2e completi, con il database reale
```

Senza `E2E_WITH_SUPABASE=1` (come in CI, dove Supabase è fittizio) i test che leggono linee e impostazioni
dal database sono saltati. I test e2e non creano utenti o richieste (solo l'integrazione delle notifiche lo fa, e
ripulisce: vedi la sezione Notifiche): gli invii di prova reali si fanno a mano e si cancellano con
`auth.admin.deleteUser` (la cancellazione dell'utente elimina a cascata profilo e richieste).

### Note e limiti noti

- **Proxy**: il `matcher` di `src/proxy.ts` aveva `\.` in una stringa JS normale, che diventa `.` e faceva
  girare il proxy solo su `/`: niente redirect di lingua e niente refresh della sessione sulle altre rotte.
  Ora è `\\.` e le rotte `/auth/*` sono escluse di proposito (restano fuori da next-intl).
- **Chi usa l'email di un altro**: il modulo non può provare che l'email sia di chi scrive. Chi inserisce
  l'email altrui può aggiungere richieste (max 3 al giorno per email) all'area clienti di quella persona, ma non
  può leggerla né accedere: serve il link nella casella di posta. Per un account già esistente nome e telefono
  non vengono modificati.
- **Scanner dei link email**: alcuni antivirus aprono i link prima dell'utente e consumano il token
  monouso. Se succede ai clienti, il rimedio è una pagina intermedia con un pulsante "Accedi" (POST).
- **Tempi di risposta**: creare un utente nuovo richiede un po' più di tempo che riusarne uno esistente.
  Con più tentativi ravvicinati qualcuno potrebbe dedurlo; il rate limit lo rende poco praticabile.
- **gitleaks**: una versione vecchia di `ci.yml` conteneva la chiave pubblicabile di Supabase
  (`sb_publishable_*`) e il job gitleaks restava rosso. Quella chiave è pubblica per progettazione (finisce in
  ogni pagina del sito), quindi `.gitleaks.toml` la esclude con una regola mirata sul formato `sb_publishable_*`.
  La chiave segreta (`sb_secret_*`) e ogni altro token vengono ancora segnalati. Verifica in container:
  `docker run --rm -v "$PWD:/repo" ghcr.io/gitleaks/gitleaks:latest git /repo`.
- `next.config.ts`: `allowedDevOrigins: ["pf-web"]` serve ai test Playwright nel container (senza, Next blocca
  gli script di sviluppo e la pagina non si idrata); `experimental.authInterrupts` abilita `forbidden()`.

## Pannello admin (F1.9)

Indirizzo: `/it/admin` (anche `/en/admin`; i testi del pannello sono solo in italiano, in `messages/admin.it.json`).
Senza accesso porta a `/accedi`; con un account che non è admin risponde 403. Per diventare admin vedi
"Primo admin" sopra; gli altri admin si invitano dal pannello stesso (pagina Utenti).

| Sezione | Percorso | Cosa fa |
|---------|----------|---------|
| Dashboard | `/admin` | richieste per stato, ultime 10, file ancora da copiare sul server interno (`synced_at` vuoto) |
| Richieste | `/admin/richieste` | filtri (stato, linea, tipo, fonte, testo), dettaglio `/admin/richieste/<id>` con dati cliente, campi della linea, storico, file (download con URL firmato di 60 s), messaggi e note interne, cambio stato con nota |
| Portfolio | `/admin/portfolio` | carica foto (jpeg/png/webp/avif, 10 MB), linea, didascalie IT/EN, ordine, «diritti ceduti» obbligatorio per pubblicare, elimina |
| Eventi | `/admin/eventi` | crea/modifica, codice fonte dal titolo (modificabile), QR scaricabile (SVG e PNG) verso `/<lingua>/lista-interesse?fonte=<codice>` |
| Contenuti | `/admin/contenuti/...` | testi IT/EN affiancati con ricerca, visibilità di pagine e linee, `accepts_requests`, interruttore lista d'interesse/preventivi, editor della `form_schema` con validazione |
| Utenti | `/admin/utenti` | elenco profili, invito di admin/operatori per email, cambio ruolo con conferma |
| Notifiche | campanella nell'header, `/admin/notifiche` | non lette dell'utente corrente, segna come letta |

### Doppia autorizzazione

Ogni azione è autorizzata due volte:

1. **Lato server**: `requireRole('admin')` nel layout e in ogni pagina; ogni Server Action e Route Handler
   richiama `guardAdmin()` (`src/lib/admin/guard.ts`), che rilegge il ruolo dal database. Una Server Action è un
   endpoint HTTP: non ci si fida del fatto che la pagina sia protetta.
2. **Nel database**: le scritture usano il client con la sessione dell'admin, quindi decide la RLS (solo admin).
   La chiave segreta si usa solo in `src/lib/admin/auth-admin.ts` (leggere l'email di un utente, invitare, cambiare
   ruolo), dove la RLS lo impedirebbe per scelta.

Gli **operatori** non entrano nel pannello: le tabelle sono accessibili solo agli admin (Q12 prevede per loro una
vista senza prezzi né dati cliente, da fare in una fase successiva).

### Migrazione del blocco (`20261123031002_admin_stato_con_nota.sql`)

- `change_request_status(p_request_id, p_status, p_note)`: cambia lo stato e scrive la nota sulla riga di storico creata
  dal trigger esistente (variabile locale alla transazione `pf.status_note` + trigger BEFORE INSERT). È `security invoker`:
  la RLS rifiuta chi non è admin.
- `profiles_protect_last_admin`: nessuno, nemmeno con la chiave segreta, può togliere il ruolo all'ultimo admin.

### Cache dei contenuti

Dopo ogni modifica di testi, linee, pagine, portfolio ed eventi le Server Action chiamano `invalidateCache(prefisso)`
(`texts:`, `lines:`, `pages:`, `portfolio:`, `events:`): la modifica compare sul sito subito, non dopo 5 minuti.
Non si svuota mai tutto il prefisso `pf:` perché su Upstash stanno anche i contatori anti-spam (`pf:rl:*`).

### Inviti agli utenti: impostazione da fare nel pannello Supabase

Authentication > Emails > Templates > **Invite user**: sostituisci `{{ .ConfirmationURL }}` con

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&redirect_to={{ .RedirectTo }}
```

Come per il magic link, così il link si convalida sul server. `/auth/confirm` accetta anche `type=invite` e porta
gli invitati con ruolo admin su `/admin`. Servono anche un SMTP personalizzato (vedi sopra) e il Redirect URL
`https://<dominio>/**` già in elenco.

### Test del pannello

```bash
docker compose run --rm app npx vitest run                                              # unitari (guardie, form_schema, codice fonte, utenti...)
docker compose --profile e2e run --rm -e E2E_WITH_SUPABASE=1 e2e npx playwright test e2e/admin.spec.ts
```

I test e2e usano il database reale: creano `pf-test+admin@example.invalid` e `pf-test+cliente@example.invalid` con
l'API admin, una richiesta con un file, eventi e una foto di prova, e in `afterAll` cancellano tutto (utenti,
richieste, eventi, foto, oggetti Storage) e ripristinano il testo modificato. Il servizio `e2e` legge lo stesso
file di variabili del servizio `app` (`PF_ENV_FILE`). Dopo una modifica ai file con il server di sviluppo già
acceso, se i test non vedono la modifica riavvia il servizio (`docker compose restart app`).

## Notifiche (F1.10)

Email al cliente (conferma, cambio stato, nuovo messaggio), email ai soci admin (nuova richiesta, file caricato,
messaggio del cliente), messaggio nel gruppo Telegram dei soci (nuova richiesta, file caricato) e notifiche in-app
per gli admin (Q13, Q27, Q31, Q35).

### Come funziona

```
evento nel database ──trigger──> tabella notification_outbox ──processore──> Resend (email) / Telegram
 (richiesta, stato,                (una riga per evento,                      src/lib/notify/
  messaggio, file)                  solo dati minimi)
```

1. **Gli eventi nascono nel database**, con trigger su `requests`, `request_messages` e `request_files`
   (migrazione `supabase/migrations/20261123031029_notifiche_outbox.sql`). Non servono modifiche all'area clienti o al
   pannello admin: qualunque codice che scriva in quelle tabelle genera l'evento. Gli stessi trigger creano le
   righe di `notifications` (avviso in-app) per ogni admin.
2. **L'outbox** (`notification_outbox`) ha RLS attiva e nessuna policy: la leggono e la scrivono solo i trigger e
   la chiave segreta del server (`service_role`). Contiene codice pubblico, linea e id tecnici, **mai** nome, email,
   telefono, testi dei messaggi o nomi dei file.
3. **Il processore** (`src/lib/notify/`, solo server) prende un lotto con `notify_claim_batch` (`for update skip locked`
   e "lease" di 5 minuti), consegna, e registra l'esito con `notify_mark_done` / `notify_mark_failed`. Le tre funzioni
   sono eseguibili solo da `service_role`.

| Evento (`event_type`) | Quando nasce | Email al cliente | Email ai soci | Telegram | In-app admin |
|-----------------------|--------------|:----------------:|:-------------:|:--------:|:------------:|
| `request_created` | nuova richiesta | si (conferma) | si | si | si |
| `status_changed` | cambio di `status`, solo se lo stato di arrivo ha `notify_client` | si | no | no | no |
| `message_from_customer` | messaggio del cliente | no | si | no | si |
| `message_from_admin` | messaggio di un admin/operatore **non interno** | si | no | no | no |
| `file_uploaded` | file caricato dal cliente (o dal server) | no | si | si | si |

Le note interne (`internal = true`) e i file caricati da admin/operatore non generano nulla. Più file caricati di
seguito sulla stessa richiesta, prima che il processore li prenda in carico, diventano **un solo** evento
(`file_count`): niente dieci email e dieci messaggi Telegram.

Interpretazioni conservative annotate: i messaggi di un operatore contano come "dello staff" (oggi la RLS non gli permette
di scrivere); le email degli admin usano la lingua del loro profilo; fr/es ricadono sull'italiano.

### Affidabilità

- **Ritentativi**: dopo un errore si riprova dopo 2, 10, 30 e 120 minuti, per un massimo di 5 tentativi
  (`src/lib/notify/backoff.ts`). Dopo il quinto l'evento resta in coda con `last_error` (solo un codice, es. `resend_403`).
- **Niente email doppie**: ogni consegna (cliente, ciascun admin, Telegram) è registrata in `delivered`; un
  ritentativo rifà solo ciò che manca. Resend riceve anche un `Idempotency-Key` per evento e destinatario.
- **Log senza dati personali**: compaiono solo l'id dell'evento e il codice dell'errore.
- Controllo della coda e riaccodamento di un evento esaurito (SQL Editor di Supabase):

  ```sql
  select id, event_type, attempts, last_error, processed_at from public.notification_outbox order by id desc limit 20;
  -- dopo aver risolto la causa (chiave, dominio, ecc.):
  update public.notification_outbox set attempts = 0, next_attempt_at = now(), last_error = null where id = 123;
  ```

### Esecuzione periodica

Due strade, entrambe chiamano lo stesso processore:

1. **Cron ogni 5 minuti** (principale): il Worker `ops/keepalive-worker` fa `POST /api/cron/notifiche` con
   `Authorization: Bearer <CRON_SECRET>`. L'endpoint confronta il segreto a tempo costante e risponde `401` senza token
   (`503` se `CRON_SECRET` non è configurato), `200` con soli conteggi (`{"enabled":true,"claimed":2,"processed":2,...}`).
   *Perché non nel Worker del sito*: l'handler OpenNext esporta solo `fetch`; aggiungere `scheduled` obbliga a sostituire `main`
   in `wrangler.jsonc` con un file che riesporta `.open-next/worker.js` e le sue classi Durable Object, da tenere allineato
   a ogni versione di OpenNext. Il Worker separato è più semplice e non tocca il deploy del sito (vedi `ops/keepalive-worker/README.md`).
2. **Invio immediato** dopo il modulo: la Server Action chiama `after(kickNotifications)` (`next/server`), quindi il
   visitatore non aspetta. Non solleva mai errori e al massimo parte una volta ogni 5 secondi per istanza.
   Se fallisce, ci pensa il cron.

Prova a mano (il segreto va letto dal file env, non scritto nel comando):

```bash
curl -i -X POST https://<dominio>/api/cron/notifiche                                    # 401
curl -i -X POST -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/notifiche   # 200
```

### Variabili d'ambiente

| Variabile | `.env.local` | Segreto/variabile del Worker del sito | Note |
|-----------|:------------:|:-------------------------------------:|------|
| `RESEND_API_KEY` | si | segreto | Chiave "solo invio". Senza, il processore **non prende in carico** nulla: gli eventi restano in coda. |
| `EMAIL_FROM` | opzionale | **obbligatoria in produzione** (segreto o variabile) | Es. `Primefactory <noreply@dominio>`. In sviluppo il default è `Primefactory <onboarding@resend.dev>`; in produzione senza `EMAIL_FROM` non parte nulla. |
| `NOTIFY_DEV_REDIRECT_TO` | solo sviluppo | non impostarla | Se impostata, **tutte** le email vanno a questo indirizzo e il destinatario originale compare nell'oggetto (`[a: ...]`). |
| `TELEGRAM_BOT_TOKEN` | si | segreto | Il token del bot (da BotFather). |
| `TELEGRAM_CHAT_ID` | si | segreto | Id del gruppo soci (numero, di solito negativo). Con token o chat id mancanti, Telegram si salta senza errore. |
| `CRON_SECRET` | si | segreto | Stringa lunga e casuale. **Lo stesso valore** va nel Worker `pf-keepalive`. |
| `NEXT_PUBLIC_SITE_URL` | si | variabile **di build** | Base dei link nelle email e nei messaggi Telegram. |

Segreti del Worker del sito, in container: `npx wrangler secret put RESEND_API_KEY` (idem per `EMAIL_FROM`,
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `CRON_SECRET`). Per `wrangler dev` mettili in `.dev.vars` (già nel `.gitignore`).
Nel Worker `pf-keepalive`: `NOTIFY_URL` e `CRON_SECRET` (vedi il suo README).

### Resend: limiti da conoscere

- Senza un **dominio verificato** su Resend, solo l'indirizzo del proprietario dell'account può ricevere email e il
  mittente deve essere `onboarding@resend.dev`. Per i clienti serve il dominio (prerequisito della Fase 1).
- In sviluppo usa `NOTIFY_DEV_REDIRECT_TO` con l'indirizzo del proprietario dell'account Resend. Mai indirizzi inventati.
- Con `RESEND_API_KEY` impostata nel tuo `.env.local`, anche un test che crea richieste (es. un invio reale del modulo)
  fa partire l'invio immediato. Per i test che scrivono richieste tieni impostata `NOTIFY_DEV_REDIRECT_TO`, oppure
  togli `RESEND_API_KEY` dall'ambiente di quel comando (`-e RESEND_API_KEY=`).

### Telegram: bot e gruppo

1. Su Telegram scrivi a `@BotFather`, `/newbot`, copia il token in `TELEGRAM_BOT_TOKEN` (solo in `.env.local`).
2. Aggiungi il bot al gruppo dei soci e scrivi un messaggio nel gruppo.
3. Ricava l'id del gruppo: `getUpdates` del bot (sul token non fare copia-incolla in chat o in un ticket) mostra
   `"chat":{"id":-100...}`. Quel numero va in `TELEGRAM_CHAT_ID`.

Il messaggio contiene **solo** codice pubblico, linea e link al pannello admin (Q31). Il tipo `TelegramInput`
(`src/lib/notify/telegram.ts`) elenca soltanto questi campi: non può leggere altro.

### Test

```bash
docker compose run --rm app npx vitest run tests/unit/notify          # template IT/EN, destinatari, backoff, bearer, Telegram, processore
docker compose run --rm -e E2E_WITH_SUPABASE=1 app npx vitest run tests/integration   # database reale, invii simulati
```

L'integrazione crea `pf-test+notifiche@example.invalid` (cliente) e `pf-test+notifiche-admin@example.invalid` (admin),
verifica trigger, outbox e notifiche in-app, esegue il processore con `fetch` finto per Resend e Telegram e alla fine
cancella tutto. Il test di **invio reale** a Resend parte solo con `NOTIFY_REAL_SEND_TEST=1` **e** `NOTIFY_DEV_REDIRECT_TO`
impostata. Il collaudo SQL è `supabase/tests/rls_smoke.sql` (etichette `N1`..`N30` per le notifiche).

### Note e limiti noti

- **Link**: puntano alla radice di area clienti (`/<lingua>/area-clienti`) e admin (`/<lingua>/admin`). Quando le pagine di
  dettaglio avranno un indirizzo stabile, si cambia solo `src/lib/notify/links.ts`.
- **Limite di richieste di un Worker**: il piano gratuito consente 50 richieste a Supabase/Resend per invocazione. Un lotto
  è di 10 eventi e le letture ripetute (linea, admin, cliente) sono memorizzate nel lotto; con molti admin e molti eventi
  insieme conviene il piano a pagamento o un lotto più piccolo (`DEFAULT_BATCH_SIZE` in `processor.ts`).
- **Pulizia**: le righe consegnate restano nell'outbox. Una pulizia periodica (per esempio dopo 90 giorni) si può unire
  al job di conservazione dati (F1.14).
- **Contenuto delle email**: dicono "c'è un nuovo messaggio/file" e rimandano all'area riservata; non riportano il testo.

## Area clienti (F1.8)

Pagine (tutte `noindex`, tutte dietro `requireUser`):

| Percorso | Cosa fa |
|----------|---------|
| `/[locale]/area-clienti` | elenco delle proprie richieste, con link al dettaglio e al profilo |
| `/[locale]/area-clienti/[codice]` | dettaglio per codice pubblico (`PF-26-0001`): dati, campi dinamici con le etichette della `form_schema`, timeline degli stati visibili al cliente, file, conversazione |
| `/[locale]/area-clienti/[codice]/file/[id]` | download di un proprio file (redirect a un URL firmato di 60 secondi) |
| `/[locale]/area-clienti/profilo` | modifica di nome, telefono, lingua; "Elimina il mio account" |
| `/[locale]/account-eliminato` | conferma pubblica dopo l'eliminazione |

La barriera è la RLS: ogni lettura usa il client della sessione, e il dettaglio filtra anche per `customer_id`
(un admin che apre il codice di un altro cliente ottiene 404 da questa pagina).

### Caricamento file (Q10)

1. Il browser valida estensione (`stl 3mf step stp obj jpg jpeg png webp heic pdf zip`) e dimensione
   (massimo `site_settings.max_upload_bytes`, mai oltre 100 MB), poi carica **direttamente** su Supabase Storage,
   bucket privato `request-files`, percorso `<request_id>/<uuid>-<nome-sanificato>`, con barra di avanzamento.
   Più file insieme: si caricano uno dopo l'altro.
2. Finito il caricamento il browser chiama una Server Action che ricontrolla tutto (proprietà della richiesta,
   percorso, estensione, dimensione, esistenza dell'oggetto nello Storage), inserisce la riga in `request_files`
   con la RLS (`uploaded_by = auth.uid()`) e, se la richiesta è in stato `richiesta`, la porta a `file_ricevuti`
   con la chiave segreta (condizionale: non tocca richieste già avanzate).
3. Nessun file è pubblico. Il download passa dal server, che genera l'URL firmato con la sessione dell'utente.
4. Un vincolo del database (`request_files_path_matches_request`) impedisce di registrare un percorso Storage
   fuori dalla cartella della propria richiesta.

Nota: il piano gratuito di Supabase ha un limite globale di dimensione dei file (50 MB) più basso di quello
del bucket: per file più grandi serve il piano Pro o il caricamento a blocchi (TUS), non ancora implementato.

### Conversazione (Q35)

Il cliente scrive messaggi di solo testo (1-5000 caratteri, mostrati escapati: niente HTML). Vede i propri e quelli
dell'admin; le note interne non sono mai visibili (RLS). La pagina si aggiorna all'invio (`revalidatePath`):
niente realtime, per scelta.

### Elimina il mio account (Q38)

Dal profilo, scrivendo la propria email (il server la confronta con quella della **sessione**, non con il form).
Poi, con la chiave segreta e solo lato server:

1. si elencano tutti gli oggetti Storage sotto `<request_id>/` di ogni richiesta del cliente e si cancellano;
   se questo passo fallisce l'account **non** viene eliminato (niente file orfani);
2. `auth.admin.deleteUser`: la cascata elimina profilo, richieste, cronologia stati, file (righe), messaggi,
   notifiche ed eventi dell'outbox collegati alle richieste;
3. si chiude la sessione e si mostra `/account-eliminato`.

Cosa **non** viene eliminato: i log tecnici dei provider (Supabase, Cloudflare) e le copie già sincronizzate sul
server interno (Q19), che vanno cancellate a mano. Prima del lancio va rivista la conservazione delle commesse
a 10 anni (Q38): oggi, pre-lancio, l'eliminazione cancella anche le richieste.

### Test dell'area clienti

```bash
docker compose run --rm app npx vitest run tests/unit/area          # nomi file, estensioni, proprietà, eliminazione (mock)
docker compose --profile e2e run --rm -e E2E_WITH_SUPABASE=1 e2e e2e/area-clienti.spec.ts --workers=1
```

L'e2e crea gli utenti `pf-test+area@example.invalid` e `pf-test+area-b@example.invalid` con la chiave segreta
(il servizio `e2e` legge lo stesso file env dell'app), li elimina in `afterAll` anche se un test fallisce e
verifica che in DB e Storage non resti nulla. Non lanciarlo insieme ad altri e2e che puliscono `pf-test+%`
(vedi `solitaria.md`, voce 18).

## Migrazioni del database: regola sui nomi dei file

Ogni file in `supabase/migrations/` si chiama `<versione>_<nome>.sql`, dove `<versione>` è **quella registrata dal database**, non un orario scelto a mano. Quando una migrazione viene applicata con lo strumento MCP `apply_migration`, la versione la decide Supabase: leggila subito dopo con `list_migrations` e rinomina il file di conseguenza. Se i nomi non coincidono, `supabase db push` proverebbe a riapplicare migrazioni già presenti.
