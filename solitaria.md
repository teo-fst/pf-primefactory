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

## 11. Lotto di notifiche "bloccato" solo durante la chiamata (2026-11-23)
- **Problema:** `for update skip locked` serve a evitare che cron e invio immediato prendano le stesse righe dell'outbox, ma ogni chiamata RPC di Supabase è una transazione a sé: il blocco sparisce appena la funzione ritorna, e due processori in parallelo avrebbero consegnato gli stessi eventi due volte.
- **Causa:** il blocco di riga dura quanto la transazione, non quanto l'invio.
- **Soluzione:** `notify_claim_batch` "affitta" le righe (lease): conta il tentativo e sposta `next_attempt_at` di 5 minuti; la riga torna disponibile da sola se il processore muore. Esito e ritentativi si scrivono con `notify_mark_done` / `notify_mark_failed`.
- **Verifica:** `rls_smoke.sql` N27-N30 (il secondo prelievo immediato non restituisce nulla, `processed_at` e `last_error` corretti); prova reale via `wrangler dev` (200, `claimed: 0`).

## 12. Email doppie nei ritentativi (2026-11-23)
- **Problema:** un evento ha più consegne (cliente, ciascun admin, Telegram). Se una falliva dopo che le altre erano partite, il ritentativo le avrebbe rimandate tutte.
- **Causa:** l'esito era per evento, non per consegna.
- **Soluzione:** colonna `delivered` nell'outbox con un gettone per consegna (`customer_email`, `admin_email:<id>`, `telegram`); il ritentativo rifà solo ciò che manca. Resend riceve anche `Idempotency-Key` per evento e destinatario.
- **Verifica:** Vitest `processor.test.ts` (Telegram fallisce, il secondo passaggio non rimanda le email; un admin fallisce, gli altri ricevono e si riprova solo quello).

## 13. Avvisi "file caricato" a raffica (2026-11-23)
- **Problema:** il cliente carica dieci file e i soci riceverebbero dieci email e dieci messaggi Telegram.
- **Causa:** il trigger sui file genera un evento per riga.
- **Soluzione:** se per la stessa richiesta c'è già un evento `file_uploaded` non ancora preso dal processore (`attempts = 0`), il trigger aumenta `payload.file_count` invece di crearne un altro. I file di admin e operatore non generano eventi.
- **Verifica:** `rls_smoke.sql` N7 e integrazione con Supabase reale (due file, un evento con `file_count` 2).

## 14. Test sul database condiviso che consumano eventi altrui (2026-11-23)
- **Problema:** durante i test con un'altra sessione attiva, l'invio immediato e il processore prendevano gli eventi dell'outbox creati dai test dell'altra sessione (e consumavano il lotto da 5, lasciando in attesa l'evento del test).
- **Causa:** il prelievo non filtra per richiesta: il database di sviluppo è unico e condiviso.
- **Soluzione:** l'integrazione usa il prelievo vero solo se non ci sono eventi altrui in coda; altrimenti prende direttamente le righe della propria richiesta. Per le prove a mano con chiavi finte si lancia il server con un database dedicato o a coda vuota.
- **Verifica:** integrazione 5/5 (1 saltato: invio reale non richiesto); prova dell'invio immediato con Resend finto: gli eventi risultano ritentati (`attempts = 1`, `last_error = resend_401`).

## 15. Gitleaks segnala segreti finti nei test (2026-11-23)
- **Problema:** gitleaks v8.30.1 segnalava `generic-api-key` su due costanti dei test del bearer (variabili chiamate `SECRET`/`secret` con una stringa lunga e varia).
- **Causa:** il nome della variabile (`secret`) più un valore ad alta entropia soddisfano la regola generica; erano valori inventati, non segreti.
- **Soluzione:** valori di prova a bassa entropia (`prova-prova-prova-prova`), nessuna eccezione in `.gitleaks.toml`. I commit locali non ancora pubblicati sono stati rifatti, così nemmeno la storia contiene più i valori.
- **Verifica:** `gitleaks git` (storia completa, 57 commit) e `gitleaks dir` sui file tracciati con v8.30.1 e `.gitleaks.toml`: nessuna fuga; i test del bearer passano ancora (rifiutano segreto sbagliato, di un carattere in più o in meno e maiuscolo).

## 16. Ciclo di redirect con token valido e account eliminato (2026-11-23)
- **Problema:** con la sessione di un account già eliminato (da un altro dispositivo, o da un test) il browser andava in `ERR_TOO_MANY_REDIRECTS` tra `/it/accedi` e `/it/area-clienti`.
- **Causa:** `/accedi` mandava all'area clienti chiunque avesse un token valido (`getClaims()` controlla solo la firma); l'area clienti, non trovando il profilo, rimandava ad `/accedi`.
- **Soluzione:** `/accedi` reindirizza solo se esiste anche il profilo (`getCurrentProfile()`); altrimenti mostra il modulo di accesso.
- **Verifica:** e2e `sessione ancora valida di un account eliminato` (crea l'utente, apre una sessione, lo elimina, apre `/it/area-clienti` e ottiene `/it/accedi` con il modulo).

## 17. Caricamento file che non partiva su http (2026-11-23)
- **Problema:** nel container e2e (`http://pf-web:3000`) la scelta di un file non avviava nessun caricamento e non compariva alcun errore.
- **Causa:** `crypto.randomUUID()` esiste solo in contesti sicuri (https o `localhost`): su http è `undefined` e lanciava un'eccezione nel gestore.
- **Soluzione:** UUID generato con `crypto.getRandomValues` (`randomUuid()` in `src/lib/account/files.ts`); ogni file è caricato in un blocco `try/catch`, così un errore imprevisto lo segna come fallito senza lasciare il modulo bloccato.
- **Verifica:** e2e `carica un file` (Storage, riga in `request_files`, stato `file_ricevuti`, download con URL firmato).

## 18. Test e2e che cancellano gli utenti di prova degli altri (2026-11-23)
- **Problema:** i test dell'area clienti fallivano a caso (`errore=link`, pagina senza richiesta, profilo non trovato) quando girava in parallelo l'e2e del pannello admin.
- **Causa:** il database di sviluppo è condiviso e la pulizia iniziale dell'e2e admin elimina **tutti** gli utenti `pf-test+%`, compresi `pf-test+area@` e `pf-test+area-b@` a metà esecuzione.
- **Soluzione:** l'e2e dell'area clienti usa il prefisso `pf-test+area` e il suo controllo dei residui conta solo quel prefisso; i test si eseguono quando non gira l'e2e admin (o si ripetono). Non si è cambiata la pulizia dell'altro blocco (fuori dal mio perimetro): conviene restringerla ai propri indirizzi (`pf-test+admin@`, `pf-test+cliente@`).
- **Verifica:** 9/9 su due esecuzioni consecutive senza l'e2e admin attivo.

## 19. Limite dei file oltre il tetto del piano gratuito (2026-11-23)
- **Problema:** bucket `request-files` e `site_settings.max_upload_bytes` a 100 MB (Q10), ma il piano gratuito di Supabase rifiuta i file oltre 50 MB: l'utente avrebbe visto un errore generico a metà caricamento.
- **Causa:** tetto globale per file del piano gratuito, più basso del limite del bucket.
- **Soluzione:** migrazione `20261123074736_limiti_file_cliente`: bucket e impostazione a 52428800 byte. Il codice usa già `site_settings` per abbassare il limite, quindi l'interfaccia mostra "50 MB". Con il piano Pro basta riportare i due valori a 104857600.
- **Verifica:** test SQL T33/T34 (bucket e impostazione a 50 MB).

## 20. Campi di sistema dei file impostabili dal cliente (2026-11-23)
- **Problema:** registrando un file, un cliente poteva valorizzare `synced_at`, `backed_up_at`, `cloud_deleted_at`, usati dal processo di copia sul server interno.
- **Causa:** permesso di insert su tutte le colonne di `request_files` per il ruolo `authenticated`.
- **Soluzione:** insert consentito solo su `request_id, storage_path, original_name, size_bytes, mime_type, uploaded_by` (stessa migrazione).
- **Verifica:** T28 (registrazione normale riuscita) e T32 (insert con `synced_at` rifiutato) in `supabase/tests/rls_smoke.sql`.

## 21. Nel pannello i campi tornavano al valore vecchio dopo il salvataggio (2026-11-23)
- **Problema:** dopo «Salva stato» il menu a tendina tornava su «Richiesta ricevuta» e un secondo clic annullava il cambio; dopo un errore i testi scritti sparivano.
- **Causa:** React 19, dopo un modulo con `action={...}`, richiama `form.reset()`. Per un `<select>` non controllato il valore iniziale non viene aggiornato (nemmeno con `key`), quindi il reset riporta il primo valore originale.
- **Soluzione:** `ActionForm` (`src/components/admin/action-form.tsx`) gestisce l'invio a mano (`preventDefault` + `startTransition`) e non fa reset; `resetOnSuccess` svuota solo il modulo dei messaggi dopo un invio riuscito.
- **Verifica:** e2e «cambio stato con nota»: il menu mostra lo stato appena salvato e un secondo invio dello stesso stato dà l'errore chiaro.

## 22. Cancellare una foto dal portfolio lasciava il file nello Storage (2026-11-23)
- **Problema:** «Elimina» rimuoveva la riga ma l'oggetto restava nel bucket `portfolio`, senza alcun errore.
- **Causa:** l'API di Storage cancella con `DELETE ... RETURNING` e per vedere la riga serve anche una policy SELECT; per il bucket `portfolio` c'erano solo insert/update/delete per gli admin.
- **Soluzione:** migrazione additiva `20261123140000_portfolio_admin_select.sql` (SELECT solo admin; la lettura pubblica delle foto non passa dalle policy).
- **Verifica:** e2e «portfolio» (l'oggetto non c'è più nel bucket dopo l'eliminazione); `rls_smoke.sql` T54 (l'admin vede gli oggetti) e T55 (il cliente no).

## 23. Caricamento foto muto da un indirizzo http interno (2026-11-23)
- **Problema:** nei test (indirizzo `http://pf-web:3000`) il pulsante «Carica» non dava né esito né errore.
- **Causa:** `crypto.randomUUID()` esiste solo nei contesti sicuri (https o localhost): da `pf-web` lanciava un'eccezione dentro la transizione, senza messaggio.
- **Soluzione:** nome file UUID v4 generato con `crypto.getRandomValues`, e `try/catch` che mostra «Caricamento non riuscito» per qualsiasi eccezione.
- **Verifica:** e2e «portfolio» da `pf-web`: foto caricata, pubblicata, eliminata.

## 24. Collaudo RLS fragile sul database condiviso (2026-11-23)
- **Problema:** `rls_smoke.sql` dava falsi rossi: «admin vede tutte = 2» falliva appena nel DB c'erano altre richieste, e i test del pannello alteravano i dati su cui contano i test delle notifiche (N1-N30).
- **Causa:** conteggi assoluti su tabelle condivise (richieste, notifiche) e ordine dei blocchi: il cambio stato di `rb` aggiunge eventi all'outbox.
- **Soluzione:** i conteggi riguardano solo i dati di prova (`id in (ra, rb)`, `user_id <> ...`); il blocco del pannello (T34-T55) gira dopo quello delle notifiche. Un'altra trappola: l'MCP annulla in automatico le istruzioni senza `WHERE`; ogni `UPDATE` del collaudo ha una condizione.
- **Verifica:** `rls_smoke.sql` completo tutto `true` con altre richieste presenti nel database.

## 25. e2e del pannello: due trabocchetti del server di sviluppo (2026-11-23)
- **Problema:** (a) `getByRole("alert")` trovava due elementi; (b) i test non vedevano le modifiche ai file appena salvati.
- **Causa:** (a) Next inserisce un suo `role="alert"` (route announcer) in ogni pagina; (b) con il volume montato dall'host il server di sviluppo a volte non ricompila al volo.
- **Soluzione:** (a) gli esiti si cercano dentro il modulo (`form.getByRole(...)`); (b) dopo modifiche al codice si riavvia il servizio (`docker compose -p pf-admin restart app`) prima degli e2e.
- **Verifica:** e2e del pannello verdi dopo il riavvio; nota nel README.
