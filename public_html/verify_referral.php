<?php
header('Content-Type: application/json');
require_once __DIR__ . '/config.php';

$code = strtoupper(trim($_GET['code'] ?? ''));
if ($code === '') {
    echo json_encode(['valid' => false, 'message' => 'Inserisci un codice valido.']);
    exit;
}

try {
    $pdo = getDBConnection();
    $stmt = $pdo->prepare('SELECT discount_amount FROM referral_codes WHERE code_value = :code AND is_active = 1 LIMIT 1');
    $stmt->execute(['code' => $code]);
    $row = $stmt->fetch();

    if ($row) {
        $discount = (float) $row['discount_amount'];
        echo json_encode([
            'valid' => true,
            'message' => '✓ Codice valido! Sbloccato sconto di ' . number_format($discount, 2, ',', '.') . '€.',
            'discount' => $discount,
        ]);
    } else {
        echo json_encode(['valid' => false, 'message' => '✗ Codice non valido o scaduto.']);
    }
} catch (Throwable $e) {
    error_log('[Referral] ' . $e->getMessage());
    echo json_encode(['valid' => false, 'message' => 'Servizio momentaneamente non disponibile.']);
}
