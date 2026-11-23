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
│   ├── lib/supabase/      client Supabase: browser, server, refresh sessione, tipi generati
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
