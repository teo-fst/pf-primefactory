# Guida al Deploy: Hostinger Shared Business Hosting (PrimeFactory)

Questa guida illustra la configurazione tecnica per pubblicare e configurare il sito vetrina di PrimeFactory sul piano **Hostinger Business Shared Hosting**, senza la necessità di un server dedicato (VPS).

---

## 💻 Tech Stack Consigliato per Hostinger
*   **Frontend**: HTML5 / CSS3 (Design custom Dark/Glassmorphic) / Vanilla JS.
*   **Backend**: PHP 8.2 / 8.3 (Nativo in Hostinger).
*   **Database**: MySQL/MariaDB (1 database incluso nel piano).
*   **Invio Email**: PHPMailer configurato via SMTP.

---

## 🛠️ Fasi di Configurazione su Hostinger (hPanel)

### 1. Caricamento dei File del Sito
I file dell'applicazione devono essere posizionati nella cartella radice del dominio (solitamente `public_html`).
*   **Opzione A (Consigliata per aggiornamenti rapidi)**: Configura la **Git Integration** da hPanel per collegare la repository (es. GitHub) e fare un pull automatico ad ogni push.
*   **Opzione B (Tradizionale)**: Utilizza un client FTP (come FileZilla) utilizzando le credenziali recuperate nella sezione **File -> Account FTP** di hPanel.

### 2. Configurazione del Database MySQL
Per abilitare il sistema referral (Codice Amico), i contatti e i futuri Magic Link, è necessario creare un database:
1.  Accedi ad hPanel -> **Database -> Database MySQL**.
2.  Crea un nuovo database (Es. `u123456789_primefactory`).
3.  Crea un nuovo utente database e assegna una password sicura.
4.  Annota i parametri da configurare nel file PHP di connessione (es. `db_connect.php`):
    *   **Host**: `localhost` (su Hostinger il database gira sullo stesso server del web server).
    *   **Database Name**: `u123456789_primefactory`
    *   **Username**: `u123456789_user`
    *   **Password**: *[La tua password]*

### 3. Modifica dei Limiti di Upload di PHP
Dato che il form accetta file 3D pesanti (fino a 35MB per file), i parametri predefiniti di Hostinger per l'upload potrebbero bloccare le richieste.
1.  Vai su hPanel -> **Avanzate -> Configurazione PHP**.
2.  Seleziona la scheda **Opzioni PHP**.
3.  Modifica i seguenti valori:
    *   `upload_max_filesize` = `64M`
    *   `post_max_size` = `80M`
    *   `max_execution_time` = `300` (garantisce che l'upload di file grandi non vada in timeout).
    *   `memory_limit` = `256M`
4.  Clicca su **Salva**.

*Nota: Se la configurazione non si applica, puoi creare/modificare un file `.htaccess` nella cartella `public_html` aggiungendo:*
```apache
php_value upload_max_filesize 64M
php_value post_max_size 80M
php_value max_execution_time 300
php_value memory_limit 256M
```

---

## 📧 Configurazione SMTP per il Form Preventivi

Su hosting condivisi, l'invio tramite la funzione nativa `mail()` di PHP finisce spesso in spam. È fortemente raccomandato l'uso di **PHPMailer** con invio SMTP protetto tramite le email gratuite incluse nel piano Hostinger.

1.  Crea una casella email su hPanel (Es. `preventivi@tuodominio.it`).
2.  Installa **PHPMailer** (scaricando la cartella direttamente nella directory del progetto o caricandola via FTP).
3.  Esempio di configurazione nel file PHP di invio del form (`send_quote.php`):

```php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'libs/PHPMailer/src/Exception.php';
require 'libs/PHPMailer/src/PHPMailer.php';
require 'libs/PHPMailer/src/SMTP.php';

$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host       = 'smtp.hostinger.com'; // Server SMTP Hostinger
    $mail->SMTPAuth   = true;
    $mail->Username   = 'preventivi@tuodominio.it';
    $mail->Password   = 'PasswordSicuraCreata';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    $mail->setFrom('preventivi@tuodominio.it', 'PrimeFactory Preventivi');
    $mail->addAddress('admin@tuodominio.it'); // Email del proprietario per notifica
    $mail->addReplyTo($client_email, $client_name); // Permette di rispondere direttamente al cliente

    // Contenuto
    $mail->isHTML(true);
    $mail->Subject = 'Nuova richiesta preventivo da ' . $client_name;
    $mail->Body    = 'Dettagli della richiesta...'; // Inserire HTML formattato

    // Allegato file 3D
    if (isset($_FILES['project_files'])) {
        $mail->addAttachment($_FILES['project_files']['tmp_name'], $_FILES['project_files']['name']);
    }

    $mail->send();
} catch (Exception $e) {
    // Gestione errore
}
```

---

## 🔒 Sicurezza & Privacy dei File Caricati

Trattandosi di file CAD industriali e privati dei clienti, è fondamentale proteggere le directory di upload.

1.  **Cartella Upload Protetta**: Crea una cartella per gli upload (Es. `public_html/uploads/`).
2.  **Blocco Esecuzione Script**: All'interno di questa cartella, crea un file `.htaccess` per impedire l'esecuzione di qualsiasi codice malevolo caricato dagli utenti:
    ```apache
    # Impedisce l'esecuzione di script PHP all'interno della cartella uploads
    <Files *.php>
        Order Deny,Allow
        Deny from all
    </Files>
    
    # Disabilita l'interprete PHP nella cartella
    RemoveHandler .php .phtml .php3
    RemoveType .php .phtml .php3
    php_flag engine off
    ```
3.  **Obfuscation dei Nomi File**: Nel codice PHP di gestione dell'upload, salva i file rinominandoli con un hash UUID (es. `550e8400-e29b-41d4-a716-446655440000.stl`) anziché mantenere il nome originale sul server, memorizzando il nome reale solo nel database protetto.
4.  **SSL/HTTPS**: Attiva il certificato SSL gratuito preinstallato su Hostinger per criptare tutto il traffico del form durante l'upload.
