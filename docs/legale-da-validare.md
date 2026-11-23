# Pagine legali — punti da validare con un professionista

Le bozze sono in `content/legal/` (italiano e inglese). Ogni file è marcato BOZZA. Prima dell'apertura della società vanno riviste da un avvocato o consulente privacy. Segnaposto da compilare: `[TITOLARE]`, `[INDIRIZZO]`, `[EMAIL_PRIVACY]`, `[P.IVA]`, `[DATA]`, `[VERSIONE]`, `[DURATA]`.

## Privacy
1. Basi giuridiche: art. 6.1.b (iscrizione, account, email), 6.1.f (anti-bot, avvisi ai soci, statistiche), 6.1.c (dati fiscali). Verificare il legittimo interesse per statistiche e Telegram.
2. Cambio di titolare da persona fisica a SRL: avviso agli iscritti e nuova informativa.
3. Accordi art. 28 con i fornitori (Supabase, Cloudflare, Vercel, Resend, Upstash, Telegram): verificare che esistano davvero prima del lancio.
4. Trasferimenti extra-UE descritti in modo generico (SCC/DPF): servono i dettagli reali per ogni fornitore; definire i dati minimi inviati a Telegram.
5. Conservazione: decorrenza dei 10 anni; tempi per il server interno e per i log tecnici non definiti.
6. Dati di accesso (IP, browser): verificare cosa registrano davvero Cloudflare, Supabase e Vercel.
7. DPO e valutazione d'impatto: confermare che non servano.

## Cookie
8. Nomi e durate reali dei cookie, da compilare dopo i test in produzione.
9. Verificare che Turnstile e Web Analytics siano strumenti tecnici senza consenso, e se Turnstile salva dati sul dispositivo.
10. La conclusione "nessun banner" si basa sull'art. 122 Codice privacy: validare con le linee guida del Garante.

## Termini e condizioni
11. A5: licenza d'uso dei file caricati dal cliente, limitata alla gestione della richiesta.
12. A10: foro competente per i non consumatori; richiamo al foro del consumatore.
13. B4: trattamento fiscale e documenti di vendita (la piattaforma non emette fatture SdI), fornitore dei pagamenti, acconto 50% e saldo.
14. B5: tempi di consegna come stime o come termini, conseguenze del ritardo, rischio di trasporto con corriere.
15. B6: art. 59 lett. c Codice del Consumo; verificare che ogni prodotto sia davvero "su misura"; informazioni precontrattuali sul recesso.
16. B7: termini e modalità di denuncia dei difetti nella garanzia legale (nessun termine inserito di proposito).
17. B10: ADR/ODR e informazioni obbligatorie per i contratti a distanza, non incluse.
18. Parte A: formulazione della limitazione di responsabilità "nei limiti di legge".

## Consenso al riuso dei modelli
19. Portata della licenza (non esclusiva, adattamento, catalogo, vendita a terzi), diritto d'autore sui modelli su commissione, opere fornite dal cliente.
20. Effetti della revoca, solo per il futuro, su usi e prodotti già realizzati.
21. Eventuale sconto per chi acconsente, ancora da definire.

## Solo uso pista
22. Richiami al Codice della Strada omessi di proposito: inserirli solo se verificati. Valutare etichettatura e obblighi di sicurezza del produttore.
23. Efficacia dell'assunzione di responsabilità del cliente, limitata a installazione e uso scorretti; la responsabilità per prodotto difettoso (d.lgs. 206/2005) non è esclusa.

## Generale
24. Modalità di accettazione e archiviazione (versione, data, ora) per termini, consenso e clausola pista; collegamenti tra pagine da adattare agli URL reali.
