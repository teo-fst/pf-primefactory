# Backlog — piattaforma web Primefactory

Derivato da `docs/decisioni-grilling.md` (riferimenti Qn). Stato iniziale: tutto da fare.

## Fase 1 — Versione pre-lancio (entro dicembre 2026)

### F1.1 Infrastruttura
- [ ] Ambiente di sviluppo in container: `docker-compose.yml` con Node 22 e Supabase CLI, healthcheck, variabili da `.env.local` (Q28).
- [ ] Scaffold Next.js App Router + TypeScript, Tailwind, shadcn/ui (Q36).
- [ ] CI GitHub Actions: lint, type-check, Vitest, Playwright, gitleaks; `main` protetto, PR per funzione (Q28).
- [ ] Progetto Supabase `primefactory` in eu-west-1, migrazioni versionate nel repo (Q29).
- [ ] Anteprime Vercel per ogni PR (Q4).
- [ ] Produzione su Cloudflare Workers con OpenNext, deploy da GitHub Actions dopo il merge (Q4, Q28).
- [ ] Ping programmato (cron Cloudflare) contro la pausa di Supabase (Q29).

### F1.2 Fondamenta interfaccia
- [ ] Identità visiva provvisoria, tema chiaro, stile tecnico (Q32).
- [ ] i18n IT/EN con `next-intl`, struttura pronta per FR/ES (Q5).
- [ ] Accessibilità WCAG 2.2 AA (Q45).

### F1.3 Contenuti e visibilità
- [ ] Linee di business e pagine con stato attiva / in sviluppo / oscurata; solo le attive pubbliche (Q2, Q34).
- [ ] CMS interno per i testi principali IT/EN (Q33).
- [ ] Bozze testi IT/EN dall'intervista (Q33).
- [ ] Pagine: Home, Moto e bici, Progettazione e scansione, Gioielleria, Riciclo (info), Siti web e reti (oscurata), Portfolio, Chi siamo, Eventi, Lista d'interesse (Q34, Q2).

### F1.4 Portfolio
- [ ] Caricamento foto da admin, linea, didascalie IT/EN, flag "diritti ceduti" obbligatorio per pubblicare (Q16).

### F1.5 Eventi
- [ ] Gestione eventi (trackday, motoraduni, fiere) e pagina pubblica (Q34).
- [ ] QR code per evento che precompila il campo "fonte" (Q39).

### F1.6 Modulo lista d'interesse
- [ ] Campi comuni: nome, email, telefono, linea, descrizione, misure, scadenza, consenso privacy, fonte (Q11, Q39).
- [ ] Campi specifici per linea, configurabili da admin (Q43).
- [ ] Interruttore unico lista d'interesse ↔ preventivo (Q8).
- [ ] Anti-spam: Cloudflare Turnstile + rate limit Upstash (Q17).

### F1.7 Autenticazione e ruoli
- [ ] Account cliente creato in automatico dal modulo, accesso con magic link (Q11).
- [ ] Ruoli admin / operatore / cliente con Row Level Security (Q12).
- [ ] Fondatore unico admin; invito utenti dal pannello (Q37).

### F1.8 Area clienti
- [ ] Elenco richieste con timeline degli stati (Q13).
- [ ] Caricamento file (bucket privato, max 100 MB per file) (Q10).
- [ ] Conversazione per richiesta con avviso email (Q35).
- [ ] Pulsante "elimina il mio account" (Q38).

### F1.9 Pannello admin minimo
- [x] Richieste: elenco, dettaglio, cambio stato, messaggi, allegati (Q13, Q35).
- [x] Gestione portfolio, eventi, testi, visibilità linee e pagine (Q16, Q34).
- [x] Notifiche in-app (Q27).

### F1.10 Notifiche
- [ ] Email Resend al cliente (conferma, cambio stato, messaggi) e ai soci (Q13, Q27).
- [ ] Bot Telegram nel gruppo soci: nuova richiesta, file caricato (Q31).

### F1.11 Pagine legali
- [ ] Bozze privacy, cookie (solo tecnici), T&C, consenso riuso, "solo uso pista", marcate "da validare" (Q26, Q15).

### F1.12 SEO e statistiche
- [ ] Schema LocalBusiness, sitemap, metadati con hreflang (Q45).
- [ ] Cloudflare Web Analytics (Q39).
- [ ] Verifica `seo-audit` e `web-design-guidelines` prima del lancio (Q45).

### F1.13 File e backup sul server di casa
- [ ] Container `ops/file-sync/` sul server interno (pull da Supabase Storage via HTTPS) con script di installazione da approvare (Q19, Q30).
- [ ] Dump giornaliero del database (Q44).
- [ ] Backup cifrato restic sulla postazione di backup (Q30).
- [ ] Cancellazione dalla cloud entro 30 giorni, solo dopo copia e backup confermati (Q19, Q30).

### F1.14 Conservazione dati
- [ ] Job di cancellazione: lista d'interesse senza seguito dopo 24 mesi (Q38).

### Prerequisiti dall'utente per la Fase 1
- [ ] Dominio acquistato su Namecheap e DNS su Cloudflare (Q9): senza dominio Resend non invia email ai clienti.
- [ ] Token del bot Telegram (Q31).
- [ ] Approvazione dello script di installazione sul server interno (Q30).

## Fase 2 — Apertura SRL

- [ ] Intestazione del sito alla SRL; passaggio da lista d'interesse a preventivi veri (Q8, Q18).
- [ ] Flusso completo degli stati, configurabile (Q13).
- [ ] Calcolatore del prezzo con tariffe per macchina e materiale (Q14).
- [ ] Consenso al riuso all'accettazione del preventivo, con versione del testo, data e ora (Q15).
- [ ] Accettazione "solo uso pista" nel preventivo (Q23).
- [ ] Stripe in modalità reale: acconto 50% con Checkout, saldo alla consegna, registrazione manuale di bonifico, contanti e POS (Q3, Q41).
- [ ] Modalità di consegna: ritiro, evento, corriere a tariffa fissa (Q42).
- [ ] Coda macchine con calendario e assegnazione manuale (Q21).
- [ ] Magazzino materiali con movimenti in grammi e avviso sottoscorta (Q22).
- [ ] Registro carico/scarico di oro e argento con titolo (Q22).
- [ ] Codici di lotto ed etichette QR stampabili (Q23).
- [ ] Export CSV e API in sola lettura per la fatturazione (Q6, Q25).
- [ ] Codici referral per youtuber e passaparola (Q40).
- [ ] Bot Telegram: preventivo accettato, sottoscorta (Q31).
- [ ] Ruolo operatore attivo per gli apprendisti (Q12).
- [ ] Trasferimento del dominio a Cloudflare Registrar (Q9).
- [ ] Valutazione Supabase Pro (Q29).
- [ ] Revisione professionale delle pagine legali; conservazione commesse 10 anni (Q26, Q38).

## Fase 3 — Successive

- [ ] Negozio con catalogo di prodotti ripetibili (Q1).
- [ ] Ricerca per somiglianza con pgvector (gte-small) su modelli e commesse (Q24).
- [ ] Assegnazione automatica della coda e integrazione API delle stampanti (Q21).
- [ ] Francese e spagnolo (Q5).
- [ ] Identità visiva definitiva (Q32).
- [ ] Attivazione della linea Siti web e reti se non c'è conflitto di interessi (Q2).
- [ ] Migrazione del container di sync dal server interno temporaneo a quello definitivo.
