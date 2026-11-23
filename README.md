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
