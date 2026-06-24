<?php
header('Content-Type: application/json');
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['valid' => false, 'message' => 'Metodo non consentito.']);
    exit;
}

$code = filter_input(INPUT_POST, 'code', FILTER_UNSAFE_RAW);
$code = strtoupper(trim($code));

if (empty($code)) {
    echo json_encode(['valid' => false, 'message' => 'Codice non inserito.']);
    exit;
}

$pdo = getDBConnection();
$stmt = $pdo->prepare("SELECT id, discount_percentage FROM referral_codes WHERE code_value = ? AND is_active = 1 LIMIT 1");
$stmt->execute([$code]);
$res = $stmt->fetch();

if ($res) {
    echo json_encode([
        'valid' => true,
        'discount' => $res['discount_percentage'],
        'id' => $res['id'],
        'message' => "Codice promozionale valido! Sconto del {$res['discount_percentage']}% applicato."
    ]);
} else {
    echo json_encode(['valid' => false, 'message' => 'Codice non valido o scaduto.']);
}