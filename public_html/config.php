<?php
// Rileva automaticamente se l'ambiente è Docker locale o Hostinger remoto
$is_local = (getenv('IS_LOCAL') === 'true' || $_SERVER['HTTP_HOST'] === 'localhost:8080');

if ($is_local) {
    // Configurazione Docker Local Container
    define('DB_HOST', 'db'); // Nome del servizio nel docker-compose
    define('DB_NAME', 'primefactory_local');
    define('DB_USER', 'prime_user');
    define('DB_PASS', 'local_secure_pass');

    define('SMTP_HOST', 'sandbox.smtp.mailtrap.io'); // Consigliato per i test locali
    define('SMTP_PORT', 2525);
    define('SMTP_USER', 'tuo_user_test');
    define('SMTP_PASS', 'tuo_pass_test');
    define('ADMIN_EMAIL', 'test-admin@primefactory.local');
} else {
    // Configurazione di Produzione Hostinger (Branch Main)
    define('DB_HOST', 'localhost'); 
    define('DB_NAME', 'u_prime_factory_db'); 
    define('DB_USER', 'u_prime_user');       
    define('DB_PASS', 'PROD_SUPER_SECURE_PASSWORD_2026!'); 

    define('SMTP_HOST', 'smtp.hostinger.com');
    define('SMTP_PORT', 587);
    define('SMTP_USER', 'info@primefactory.it'); 
    define('SMTP_PASS', 'SmtpProdPassword2026!');     
    define('ADMIN_EMAIL', 'ordini@primefactory.it');
}

function getDBConnection() {
    try {
        $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        return $pdo;
    } catch (PDOException $e) {
        error_log("[" . date('Y-m-d H:i:s') . "] DB Error: " . $e->getMessage());
        die(json_encode(['success' => false, 'error' => 'Errore di connessione al database.']));
    }
}

function generateUUIDv4() {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}