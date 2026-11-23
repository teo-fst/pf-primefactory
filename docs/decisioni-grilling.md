# Decisioni di progetto — piattaforma web Primefactory

Registro delle decisioni prese durante la sessione di grilling. Base: intervista di progetto (documento privato, non versionato).

## Giro 1 — 2026-11-23

| # | Tema | Decisione |
|---|------|-----------|
| Q1 | Scopo | Vetrina + richiesta preventivo + area clienti + gestionale interno (commesse, coda macchine, materiali, lotti). Il preventivo NON prevede caricamento di file: STL, foto e misure arrivano in una seconda comunicazione. Negozio a catalogo (fase D) solo quando esistono prodotti ripetibili. |
| Q2 | Linee di business | Operative: 1 moto/bici, 2 progettazione/scansione/reverse engineering, 3 gioielleria. Linea 4 riciclo: solo pagina informativa. Linea 5 siti web e reti: sviluppata ma oscurata in caso di conflitto di interessi. Regola generale: ogni linea può essere "attiva", "in sviluppo" o "oscurata"; solo le attive sono visibili sul sito. |
| Q3 | Pagamenti | Ora solo preventivi, pagamento fuori piattaforma. Stripe in modalità reale solo dopo la costituzione della SRL. |
| Q4 | Hosting | Vercel (Hobby) per sviluppo e anteprime; produzione su Cloudflare Workers (OpenNext). |
| Q5 | Lingue | Italiano e inglese al lancio, struttura i18n pronta; francese e spagnolo dopo, traduzioni della socia. |
| Q6 | Fatturazione | La piattaforma non emette fatture SdI. Esporta ordini/pagamenti (CSV o API) verso il software di fatturazione proprietario. |
| Q7 | Scadenze | Prima versione online entro dicembre 2026 (vetrina, portfolio, preventivi, area clienti). Gestionale interno entro l'apertura della SRL. |

## Giro 2 — 2026-11-23

| # | Tema | Decisione |
|---|------|-----------|
| Q8 | Titolare pre-SRL | Prima modalità pre-lancio (portfolio + lista d'interesse, niente prezzi né vendite), poi intestazione a un socio (dettaglio in Q18), poi SRL. Interruttore unico lista d'interesse ↔ preventivi. |
| Q9 | Dominio | Acquisto su Namecheap in sviluppo, poi trasferimento a Cloudflare Registrar (possibile dopo 60 giorni dalla registrazione). |
| Q10 | File seconda battuta | Link all'area clienti per il caricamento; archiviazione definitiva su storage interno (dettaglio in Q19). |
| Q11 | Account clienti | Nessuna registrazione: modulo (nome, email, telefono, linea, descrizione, misure, scadenza, consenso privacy), account creato in automatico, accesso con magic link Supabase. |
| Q12 | Ruoli | Admin (3 soci), Operatore (apprendisti, niente prezzi né dati cliente oltre al nome), Cliente. |
| Q13 | Stati commessa | richiesta → file ricevuti → in valutazione → preventivo inviato → accettato/rifiutato/scaduto → in produzione → controllo qualità → pronto → consegnato/spedito → chiuso. Email al cliente a ogni cambio rilevante. Stati configurabili in seguito. |
| Q14 | Calcolatore prezzo | Interno, solo admin: ore macchina × tariffa + grammi × €/g + ore progettazione × tariffa + post-lavorazione + margine %. Tariffe configurabili, prezzo finale modificabile. Mai pubblico. |
| Q15 | Consenso riuso | Casella facoltativa all'accettazione del preventivo, come per termini e condizioni; testo pubblicato in una pagina del sito; salvati testo (versione), data e ora. Archivio riutilizzabile solo con consenso. Sconto da decidere. |
| Q16 | Portfolio | CMS interno: foto caricate dal pannello admin, linea di business, didascalie IT/EN, flag "diritti ceduti alla società" obbligatorio per pubblicare. |
| Q17 | Upstash | Rate limit dei moduli (+ Cloudflare Turnstile) e cache delle pagine pubbliche. |

## Giro 3 — 2026-11-23

| # | Tema | Decisione |
|---|------|-----------|
| Q18 | Titolare | il fondatore come privato durante il pre-lancio; poi intestato all'attività (SRL). Nessuna partita IVA individuale. |
| Q19 | Storage file | Upload su Supabase Storage (bucket privato) → copia automatica su server interno (oggi temporaneo, poi definitivo) via Tailscale → cancellazione dalla cloud entro 30 giorni dalla copia confermata. NAS non esistente. |
| Q20 | Versione dicembre | Vetrina IT/EN con linee attivabili, portfolio, modulo lista d'interesse (convertibile in preventivo), account automatico + area clienti (stato + upload), admin minimo (richieste, stati, portfolio, visibilità linee), pagine legali, email automatiche. Il resto entro l'apertura SRL. |
| Q21 | Coda macchine | Anagrafica macchine con stato; assegnazione manuale su calendario con tempo stimato. Automazione e API stampanti in fase successiva. |
| Q22 | Magazzino | Movimenti in grammi per filamenti, resine, cere, metalli; avviso sottoscorta; registro carico/scarico oro e argento con titolo. |
| Q23 | Lotti | Codice lotto per pezzo (commessa, data, macchina, lotto materiale) + etichetta QR; "solo uso pista" accettato nel preventivo e stampato in etichetta. |
| Q24 | pgvector | Ricerca per somiglianza su archivio modelli e commesse (gte-small), in fase successiva. |
| Q25 | Export | CSV per periodo + API in sola lettura con chiave. Il software di fatturazione non esiste ancora: tracciato generico con i campi utili alla FatturaPA. |
| Q26 | Legali | Bozze di privacy, cookie (solo tecnici), T&C, consenso riuso, "solo uso pista", marcate "da validare". |
| Q27 | Avvisi interni | Email ai soci + notifiche nel pannello admin + bot Telegram, tutto al lancio. |
| Q28 | Flusso sviluppo | `main` protetto, PR per funzione, anteprime Vercel, produzione Cloudflare via GitHub Actions, sviluppo in container (Node 22 + Supabase CLI), CI con lint, type-check, test, gitleaks. |
| Q29 | Supabase | Nuovo progetto `primefactory`, regione eu-west-1 (Irlanda), piano gratuito + ping programmato fino alla SRL; poi valutare Pro. |

## Giro 4 — 2026-11-23

| # | Tema | Decisione |
|---|------|-----------|
| Q30 | Sync file | Container in questo repo (`ops/file-sync/`), installato sul server interno con script approvato, modello pull. Backup cifrato `restic` sulla postazione di backup. I file restano su Supabase finché il backup non è attivo. |
| Q31 | Telegram | Bot privato nel gruppo soci: nuova richiesta, file caricato, preventivo accettato, sottoscorta. Token `TELEGRAM_BOT_TOKEN` in `.env.local`. |
| Q32 | Identità visiva | Provvisoria, tema chiaro, stile tecnico; da sostituire più avanti. |
| Q33 | Testi | Bozze IT/EN scritte da Claude dall'intervista; testi principali modificabili dal pannello admin. |
| Q34 | Pagine | Home, una pagina per linea attiva, Riciclo (info), Portfolio, Chi siamo, Eventi, Lista d'interesse/Preventivo, legali. Interruttore attiva/in sviluppo/oscurata per pagina. |
| Q35 | Messaggi | Conversazione per richiesta tra cliente e soci, con avviso email. |
| Q36 | Base tecnica | Next.js App Router + TS, Tailwind + shadcn/ui, next-intl, @supabase/ssr, OpenNext Cloudflare, Vitest + Playwright. |
| Q37 | Admin iniziali | Solo il fondatore in pre-lancio; soci invitati dal pannello. |
| Q38 | GDPR | Lista d'interesse senza seguito: cancellazione a 24 mesi; commesse: 10 anni; pulsante "elimina il mio account". |
| Q39 | Statistiche | Cloudflare Web Analytics (senza cookie) + campo "fonte" con QR per evento. |
| Q40 | Codici referral | Youtuber e passaparola dopo la versione di dicembre, insieme ai preventivi veri. |

## Giro 5 — 2026-11-23

| # | Tema | Decisione |
|---|------|-----------|
| Q41 | Pagamenti post-SRL | Acconto 50% con Stripe Checkout all'accettazione; saldo alla consegna (Stripe, contanti, POS agli eventi); bonifico registrato a mano. Percentuali configurabili. |
| Q42 | Consegna | Ritiro in sede, consegna a evento, corriere a tariffa fissa Italia configurabile; nessuna integrazione corriere. |
| Q43 | Campi per linea | Moto/bici: marca, modello, anno, uso. Gioielleria: metallo, misura, occasione/data. Progettazione: tipo servizio, consegna file modello. Configurabili da admin. |
| Q44 | Backup DB | Dump giornaliero dal container di sync sul server interno, incluso nel backup restic. |
| Q45 | SEO e accessibilità | Schema LocalBusiness, sitemap, metadati IT/EN con hreflang, WCAG 2.2 AA, verifica con `seo-audit` e `web-design-guidelines` prima del lancio. |
