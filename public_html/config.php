<?php
session_start();

$envPath = __DIR__ . '/../.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        [$name, $value] = array_pad(explode('=', $line, 2), 2, '');
        $name = trim($name);
        $value = trim($value);
        if ($name !== '' && !array_key_exists($name, $_ENV)) {
            putenv("{$name}={$value}");
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'u123456789_primefactory');
define('DB_USER', getenv('DB_USER') ?: 'u123456789_user');
define('DB_PASS', getenv('DB_PASS') ?: 'PasswordSicuraCreata');
define('ENCRYPTION_KEY', getenv('ENCRYPTION_KEY') ?: '3c1a47ff1e1e1effffffffffffffffffb6ff00ff0040ffffffffffffffffffff');
define('MAIL_HOST', getenv('MAIL_HOST') ?: 'smtp.hostinger.com');
define('MAIL_USERNAME', getenv('MAIL_USERNAME') ?: 'preventivi@tuodominio.it');
define('MAIL_PASSWORD', getenv('MAIL_PASSWORD') ?: 'PasswordSicuraCreata');
define('MAIL_FROM', getenv('MAIL_FROM') ?: 'preventivi@tuodominio.it');
define('MAIL_TO', getenv('MAIL_TO') ?: 'admin@tuodominio.it');
define('UPLOAD_DIR', __DIR__ . '/uploads/');

date_default_timezone_set('Europe/Rome');

function getDBConnection(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    try {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
        return $pdo;
    } catch (PDOException $e) {
        error_log('[DB] ' . $e->getMessage());
        throw $e;
    }
}

function generateUuid(): string {
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff)
    );
}

function encryptFileName(string $data): string {
    $iv = openssl_random_pseudo_bytes(openssl_cipher_iv_length('aes-256-cbc'));
    $encrypted = openssl_encrypt($data, 'aes-256-cbc', hex2bin(ENCRYPTION_KEY), 0, $iv);
    return base64_encode($encrypted . '::' . $iv);
}

function ensureUploadDirectory(): void {
    if (!is_dir(UPLOAD_DIR)) {
        mkdir(UPLOAD_DIR, 0755, true);
    }
}

function sanitizeText(?string $value): string {
    return trim(strip_tags((string) ($value ?? '')));
}

function formatBytes(int $size): string {
    $units = ['B', 'KB', 'MB', 'GB'];
    $index = 0;
    while ($size >= 1024 && $index < count($units) - 1) {
        $size /= 1024;
        $index++;
    }
    return round($size, 2) . ' ' . $units[$index];
}
