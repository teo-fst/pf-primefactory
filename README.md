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
│   ├── i18n/              configurazione next-intl (lingue, routing, messaggi)
│   ├── lib/supabase/      client Supabase: browser, server, refresh sessione
│   └── proxy.ts           unisce next-intl e sessione Supabase
├── messages/              testi tradotti: it.json, en.json
├── e2e/                   test Playwright
├── tests/unit/            test Vitest
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
dal database sono saltati. Nessun test crea utenti o richieste: gli invii di prova reali si fanno a mano e si
cancellano con `auth.admin.deleteUser` (la cancellazione dell'utente elimina a cascata profilo e richieste).

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
