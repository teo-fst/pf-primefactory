# Problemi risolti in autonomia

Registro dei problemi incontrati durante lo sviluppo e risolti senza intervento dell'utente.
Per ogni voce: problema, causa, soluzione, verifica. Le voci più recenti stanno in fondo.

## 1. Valori Upstash non letti nei container (2026-11-23)
- **Problema:** la chiamata di prova a Upstash dava `HTTP 000`.
- **Causa:** in `.env.local` i valori erano tra virgolette; `docker --env-file` le considera parte del valore.
- **Soluzione:** il codice che legge le variabili (`src/lib/content/env.ts`, helper Upstash) toglie virgolette e spazi.
- **Verifica:** `PONG` da Upstash con i valori ripuliti; le chiavi `pf:*` compaiono su Upstash durante i test.

## 2. Chiave segreta Supabase ignorata (2026-11-23)
- **Problema:** l'API admin di Supabase rispondeva `401`.
- **Causa:** in `.env.local` c'erano due righe `SUPABASE_SECRET_KEY`: quella compilata (riga 1) e una vuota aggiunta da Claude in fondo; l'ultima prevale.
- **Soluzione:** rimossa solo la riga vuota, senza leggere i valori.
- **Verifica:** `GET /auth/v1/admin/users` → `HTTP 200`.

## 3. Avviso Supabase "multiple permissive policies" (2026-11-23)
- **Problema:** le policy admin `for all` si sovrapponevano alle policy di lettura su 8 tabelle.
- **Causa:** `for all` include anche `select`.
- **Soluzione:** policy admin divise in insert/update/delete (`supabase/migrations/20261123020604_split_admin_policies.sql`). Eseguita dall'utente nel SQL Editor perché il client annulla in automatico le conferme MCP per istruzioni distruttive.
- **Verifica:** advisor di sicurezza e prestazioni senza avvisi (resta solo "indici non usati", normale con DB vuoto); `supabase/tests/rls_smoke.sql` 24/24.

## 4. Vulnerabilità npm moderate (2026-11-23)
- **Problema:** `npm audit` segnalava 6 vulnerabilità moderate (glob, minimatch).
- **Causa:** `shadcn` (CLI) e `@opennextjs/cloudflare` erano tra le dipendenze di produzione, ma sono strumenti di build.
- **Soluzione:** spostati in `devDependencies`.
- **Verifica:** `npm audit --omit=dev` → 0 vulnerabilità; build OK.

## 5. Cache Components incompatibile con Cloudflare (2026-11-23)
- **Problema:** su OpenNext/Workers `/it` rispondeva `500` ("This promise was created by a request that has since ended").
- **Causa:** Cache Components e `partialPrefetching` attivi nello scaffold, non ancora supportati da OpenNext.
- **Soluzione:** disattivati in `next.config.ts`; cache delle pagine pubbliche con Upstash.
- **Verifica:** `wrangler dev` → `/it` e `/en` 200.

## 6. Playwright forzato su https (2026-11-23)
- **Problema:** i test e2e fallivano con `ERR_SSL_PROTOCOL_ERROR`.
- **Causa:** il servizio Docker si chiama `app`; Chromium tratta `.app` come TLD con HSTS e forza https.
- **Soluzione:** alias di rete `pf-web` e `BASE_URL=http://pf-web:3000`.
- **Verifica:** Playwright 2/2 in locale e in CI.

## 7. Eccezione gitleaks che nascondeva chiavi segrete (2026-11-23)
- **Problema:** l'eccezione per la chiave publishable di Supabase in `ci.yml` (condizione AND su percorso + prefisso `sb_publishable_`) nascondeva anche una chiave `sb_secret_` scritta in `ci.yml`.
- **Causa:** comportamento dell'allowlist con condizione AND in gitleaks v8.30.1: veniva soppressa ogni segnalazione nel file.
- **Soluzione:** eccezione sul valore esatto della chiave publishable del progetto, con `regexTarget = "secret"` (`.gitleaks.toml`).
- **Verifica:** test su cartella di prova: `sb_secret_` segnalata sia in `ci.yml` sia in altri file, la chiave publishable del progetto no; scansione della storia completa: nessuna fuga.

## 8. Gitleaks in CI diverso da quello locale (2026-11-23)
- **Problema:** dopo la correzione 7, il job Gitleaks della PR #3 restava rosso sulla chiave publishable in `ci.yml`.
- **Causa:** `gitleaks-action@v2` installa di default gitleaks 8.24.3, che non applica la sintassi `[[allowlists]]` di `.gitleaks.toml`; i test locali usavano la 8.30.1.
- **Soluzione:** `GITLEAKS_VERSION: 8.30.1` nel job Gitleaks di `.github/workflows/ci.yml`, così CI e test locali usano la stessa versione.
- **Verifica:** job Gitleaks verde sulla PR #3 (vedi esito CI del commit che introduce questa voce).

## 9. Proxy attivo solo sulla home (2026-11-23)
- **Problema:** redirect di lingua e aggiornamento della sessione Supabase non avvenivano fuori da `/` (es. `/portfolio` senza lingua dava 404).
- **Causa:** in `src/proxy.ts` il `matcher` conteneva `\.` in una stringa JS normale, che diventa `.`: la regex corrispondeva solo a `/`.
- **Soluzione:** `\.` nel matcher; rotte `auth/*` escluse dal routing per lingua (percorso fisso richiesto dal template email).
- **Verifica:** test Playwright: `/lista-interesse` → 307 su `/it/lista-interesse`, con `Accept-Language: en` → `/en/...`, `/auth/confirm` non prefissato.

## 10. Integrazione dei blocchi sito pubblico e login (2026-11-23)
- **Problema:** dopo il merge di `main` nel branch del login: conflitti in `package.json`, lockfile, `.gitleaks.toml`, tipi Supabase; errore TypeScript "Duplicate identifier 'Database'"; `<main>` annidati.
- **Causa:** i due agenti hanno lavorato in parallelo sugli stessi file condivisi.
- **Soluzione:** unione delle dipendenze e lockfile rigenerato; `.gitleaks.toml` di `main` (regola sul valore esatto, voce 7); tipi del branch login (includono `get_user_id_by_email`); import duplicato rimosso in `src/lib/supabase/server.ts`; `<main>` delle pagine login trasformati in `<div>` (il layout comune ha già `<main id="contenuto">`).
- **Verifica:** lint, `tsc`, Vitest 111/111, build Next e OpenNext, Playwright 40/40 sul DB reale.
- **Nota:** il pacchetto npm `cn` usato dalle componenti UI è stato controllato: è il pacchetto ufficiale di shadcn (manutentore shadcn, provenance SLSA, nessuno script di installazione).
