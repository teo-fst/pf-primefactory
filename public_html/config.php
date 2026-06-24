<?php
// Rileva se siamo nell'ambiente Docker locale o su Hostinger
define('IS_LOCAL', (getenv('IS_LOCAL') === 'true' || $_SERVER['HTTP_HOST'] === 'localhost:8080'));

if (IS_LOCAL) {
    // Caricamento dinamico tramite variabili iniettate dal file .env
    define('DB_HOST', getenv('DB_HOST') ?: 'db');
    define('DB_NAME', getenv('DB_NAME') ?: 'primefactory_local');
    define('DB_USER', getenv('DB_USER') ?: 'prime_user');
    define('DB_PASS', getenv('DB_PASS') ?: 'local_secure_pass');

    define('SMTP_HOST', getenv('SMTP_HOST')); 
    define('SMTP_PORT', (int)getenv('SMTP_PORT'));
    define('SMTP_USER', getenv('SMTP_USER'));
    define('SMTP_PASS', getenv('SMTP_PASS'));
    define('ADMIN_EMAIL', getenv('ADMIN_EMAIL'));
} else {
    // Configurazione di Produzione Hostinger (attiva sul branch main)
    define('DB_HOST', 'localhost');
    define('DB_NAME', 'u_prime_factory_db'); 
    define('DB_USER', 'u_prime_user');       
    define('DB_PASS', 'CambiamiConPasswordForteHostinger2026!'); 

    define('SMTP_HOST', 'smtp.hostinger.com');
    define('SMTP_PORT', 587);
    define('SMTP_USER', 'info@primefactory.it'); 
    define('SMTP_PASS', 'SmtpProdPassword2026!');     
    define('ADMIN_EMAIL', 'ordini@primefactory.it');
}

function getDBConnection() {
    try {
        return new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (PDOException $e) {
        error_log("[" . date('Y-m-d H:i:s') . "] Errore Connessione DB: " . $e->getMessage());
        header('Content-Type: application/json', true, 500);
        die(json_encode(['success' => false, 'error' => 'Connessione al database fallita.']));
    }
}

function generateUUIDv4() {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}