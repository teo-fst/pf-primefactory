# Mockup Concettuale: Form Preventivo Avanzato (PrimeFactory)

Questo documento definisce la struttura logica, l'architettura dei campi, le regole di validazione e il comportamento d'interfaccia (UX/UI) del modulo di contatto a 3 step per la richiesta preventivo.

---

## 🎨 Layout Concettuale (Wireframe UI)

```text
+--------------------------------------------------------------------------+
|  RICHIEDI UN PREVENTIVO GRATUITO                                         |
|                                                                          |
|  [ Step 1: Dati ] -------- ( Step 2: Tecnica ) -------- ( Step 3: File )  |
|                                                                          |
|  +--------------------------------------------------------------------+  |
|  | STEP 1: DATI ANAGRAFICI E REFERRAL                                 |  |
|  |                                                                    |  |
|  | Nome / Ragione Sociale *                                           |  |
|  | [ Mario Rossi / Tech SRL                                       ]   |  |
|  |                                                                    |  |
|  | Indirizzo Email * (Uso per accesso futuro)                         |  |
|  | [ mario.rossi@example.com                                      ]   |  |
|  |                                                                    |  |
|  | Codice Amico (Opzionale)                                           |  |
|  | [ AMICO-5671           ]  [ V Verde: Codice Valido (Sconto 10%) ]  |  |
|  +--------------------------------------------------------------------+  |
|                                                                          |
|  [ Annulla ]                                        [ Continua al Step 2 ]  |
+--------------------------------------------------------------------------+
```

---

## 📋 Specifiche Tecniche dei Campi per Step

### STEP 1: Dati Anagrafici e Referral
L'obiettivo di questo step è qualificare il contatto e raccogliere i dati per l'onboarding e per le logiche di sconto referral.

1.  **Nome / Ragione Sociale**
    *   **Tag HTML**: `<input type="text">`
    *   **ID**: `client_name`
    *   **Attributi**: `required`, `placeholder="Nome e Cognome o Ragione Sociale"`
    *   **Validazione**: Minimo 3 caratteri.
2.  **Email**
    *   **Tag HTML**: `<input type="email">`
    *   **ID**: `client_email`
    *   **Attributi**: `required`, `placeholder="nome@azienda.com"`
    *   **Validazione**: Formato email standard (`email_validator`). Questo indirizzo riceverà il *Magic Link* UUID per accedere all'area riservata post-invio.
3.  **Codice Amico / Sconto (Opzionale)**
    *   **Tag HTML**: `<input type="text">`
    *   **ID**: `referral_code`
    *   **Attributi**: `placeholder="Es. AMICO-1234, SCONTO-5"`
    *   **Validazione Real-Time (AJAX)**:
        *   Mentre l'utente scrive (dopo 6 caratteri, o al `blur` dell'input), una chiamata asincrona interroga un file PHP (`verify_referral.php`) sul database Hostinger.
        *   *Stato Validazione*:
            *   **Successo**: Input con bordo verde, messaggio di feedback sotto il campo: *"✓ Codice valido! Sbloccato sconto 5€/ <importo sconto dal codice sconto>"*.
            *   **Errore**: Input con bordo rosso, messaggio: *"✗ Codice non valido o scaduto"*.

---

### STEP 2: Specifiche Tecniche del Progetto
L'obiettivo è comprendere le esigenze tecniche del cliente per instradare la lavorazione corretta.

4.  **Tipo di Servizio Richiesto**
    *   **Tag HTML**: `<input type="radio">` (gruppo con lo stesso `name`)
    *   **ID**: `service_ready` (Opzione A), `service_needs_cad` (Opzione B), `service_give_plastic` (Opzione C)
    *   **Attributi**: `required` (almeno una scelta obbligatoria)
    *   **Valori**:
        *   `ready` -> "Ho già il file 3D pronto per la stampa"
        *   `needs_cad` -> "Ho bisogno del servizio di progettazione CAD / Reverse Engineering"
        *   `give_plastic` -> "Ho della plastica da convertire in punti"
5.  **Tecnologia Desiderata (Se nota, per opzioni A, opzione B)**
    *   **Tag HTML**: `<select>` con `<option>`
    *   **ID**: `preferred_technology`
    *   **Opzioni**:
        *   `fdm` -> "FDM (Filamento - Ideale per prototipi robusti e parti funzionali)"
        *   `resina` -> "Resina (Alta definizione - Ideale per dettagli estetici e miniature)"
        *   `non_saprei` -> "Non saprei, chiedo consiglio tecnico"
6.  **Materiale Preferito (Se noto, per opzioni A, opzione B)**
    *   **Tag HTML**: `<select>` con `<option>`
    *   **ID**: `preferred_material`
    *   **Opzioni**:
        *   `pla_riciclato` -> "PLA Riciclato (Sostenibile ed economico)"
        *   `pla` -> "PLA (Sostenibile)"
        *   `petg` -> "PETG (Resistente all'esterno ed elastico)"
        *   `abs` -> "ABS (Elevata resistenza termica e meccanica)"
        *   `resina_standard` -> "Resina Standard (Dettagli definiti, superficie liscia)"
        *   `resina_tech` -> "Resina Tech (Funzionale, flessibile o rigida per ingegneria)"
        *   `non_saprei` -> "Non saprei, chiedo consiglio tecnico"
7.  **Plastica Consegnata(Solo se scelta opzione C)**
    *   "La plastica consegnata non deve essere sporca di alimenti o grassi/oli, si prega una prima pulizia a casa"
    *   **Tag HTML**: `<select>` con `<option>`
    *   **ID**: `gived_material`
    *   **Opzioni**:
        *   `pla` -> "PLA di vecchie stampe"
        *   `petg` -> "PETG di vecchie stampe"
        *   `abs` -> "ABS di vecchie stampe"
        *   `from_home` -> "Bottiglie o Flaconi di plastica"
        *   `non_saprei` -> "Non saprei, chiedo se può essere utile"
8.  **Stima del peso (Solo se scelta opzione C)**
    *   **Tag HTML**: `<input type="numeric">`
    *   **ID**: `quantity_plastic`
    *   **Validazione**: numero compreso tra 1kg e 20kg

---

### STEP 3: Caricamento File e Note
L'obiettivo è raccogliere i file geometrici e le note finali di lavorazione.

7.  **Caricamento File Geometrico (Opzionale)**
    *   **Tag HTML**: `<input type="file">`
    *   **ID**: `project_files`
    *   **Attributi**: `multiple` (permette il caricamento di più parti), `accept=".png,.jpg,.jpeg,.stl,.step,.stp,.igs,.obj"`
    *   **Regole di Controllo (Client-side JS)**:
        *   *Estensioni permesse*: `.PNG`, `.JPG`, `.JPEG`, `.STL`, `.STEP`, `.STP`, `.IGS`, `.OBJ`. In caso di formato errato, blocco e avviso immediato.
        *   *Dimensione massima*: Max **35MB per singolo file**. Se superato, JS blocca l'upload e suggerisce di comprimere il file o inviarlo via WeTransfer/email.
8.  **Note sul Progetto / Tolleranze / Utilizzo finale**
    *   **Tag HTML**: `<textarea>`
    *   **ID**: `project_notes`
    *   **Attributi**: `rows="6"`, `required`, `placeholder="Es. Il pezzo deve resistere a 60°C in esterno e accoppiarsi con una vite M4..."`
9.  **Checkbox Consensi**
    *   **Tag HTML**: `<input type="checkbox">`
    *   **ID**: `privacy_consent`
    *   **Attributi**: `required`
    *   **Label**: *"Accetto la Privacy Policy e il trattamento dei dati personali ai sensi del GDPR."* (con link ipertestuale alla Privacy Policy del sito).

---

## ⚙️ Logiche UX & Validazione Javascript (Client-side)

Per migliorare il tasso di conversione e la fluidità d'uso:

*   **Pulsanti Avanti/Indietro**: Ciascun passaggio convalida solo i campi dello step attivo prima di consentire la transizione allo step successivo.
*   **Barra di Progresso**: Un indicatore visivo in alto mostra la progressione nei 3 step (Stato: *Completato / Attivo / Da Fare*).
*   **Caricamento Asincrono dei File (Drag and Drop)**: L'area di caricamento del file al terzo step supporta il drag & drop grafico con una barra di caricamento visiva in percentuale.

---

## 🛡️ Gestione Server-Side su Hostinger (PHP)

Dato che il sito girerà su hosting condiviso Hostinger, il backend PHP che gestisce la sottomissione deve configurare:

*   **Verifica Limiti PHP**: Modifica del file `.htaccess` (o configurazione pannello hPanel) per allineare i limiti di upload di Hostinger:
    ```ini
    upload_max_filesize = 64M
    post_max_size = 80M
    max_execution_time = 300
    ```
*   **Sanitizzazione dei campi input**: Controllare gli input per prevenire sql_injection e xss.
*   **Sanitizzazione dei File**: Rinominare i file caricati sul server usando stringhe UUID per evitare collisioni di file e proteggere la proprietà intellettuale dei progetti dei clienti.
*   **Notifiche email**: Generazione di un'email formattata in HTML via SMTP che notifica all'amministratore il nuovo lead e invia una conferma al cliente con le specifiche inserite.
