<?php
header('Content-Type: application/json');
require_once 'config.php';

// Caricamento librerie tramite Composer installato nel Container
require 'vendor/autoload.php'; 

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Richiesta non valida.']);
    exit;
}

$pdo = getDBConnection();

// Sanitizzazione Input
$client_name = filter_input(INPUT_POST, 'client_name', FILTER_UNSAFE_RAW);
$client_email = filter_input(INPUT_POST, 'client_email', FILTER_VALIDATE_EMAIL);
$referral_code_id = filter_input(INPUT_POST, 'referral_code_id', FILTER_VALIDATE_INT) ?: null;
$service_type = filter_input(INPUT_POST, 'service_type', FILTER_UNSAFE_RAW);
$technology = filter_input(INPUT_POST, 'technology', FILTER_UNSAFE_RAW) ?: null;
$material = filter_input(INPUT_POST, 'material', FILTER_UNSAFE_RAW) ?: null;
$quantity_kg = filter_input(INPUT_POST, 'quantity_kg', FILTER_VALIDATE_FLOAT);
$project_notes = filter_input(INPUT_POST, 'project_notes', FILTER_UNSAFE_RAW);
$privacy_consent = filter_input(INPUT_POST, 'privacy_consent', FILTER_VALIDATE_BOOLEAN);

if (strlen($client_name) < 3 || !$client_email || !$quantity_kg || empty($project_notes) || !$privacy_consent) {
    echo json_encode(['success' => false, 'error' => 'Verificare la correttezza dei dati obbligatori inseriti.']);
    exit;
}

// Validazione Files Server-side
$allowed_exts = ['png', 'jpg', 'jpeg', 'stl', 'step', 'stp', 'igs', 'obj'];
$max_size = 35 * 1024 * 1024; // 35MB
$uploaded_files = [];

if (!empty($_FILES['project_files']['name'][0])) {
    $files = $_FILES['project_files'];
    for ($i = 0; $i < count($files['name']); $i++) {
        if ($files['error'][$i] !== UPLOAD_ERR_OK) {
            echo json_encode(['success' => false, 'error' => 'Errore nel caricamento del file.']);
            exit;
        }
        if ($files['size'][$i] > $max_size) {
            echo json_encode(['success' => false, 'error' => 'Uno dei file supera la dimensione limite di 35MB.']);
            exit;
        }
        $ext = strtolower(pathinfo($files['name'][$i], PATHINFO_EXTENSION));
        if (!in_array($ext, $allowed_exts)) {
            echo json_encode(['success' => false, 'error' => "Estensione .{$ext} non supportata."]);
            exit;
        }
        $uploaded_files[] = [
            'tmp' => $files['tmp_name'][$i],
            'orig' => basename($files['name'][$i]),
            'size' => $files['size'][$i],
            'ext' => $ext
        ];
    }
}

try {
    $pdo->beginTransaction();

    // Inserimento / Recupero Cliente
    $stmt = $pdo->prepare("INSERT INTO clients (name, email) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = ?, id = LAST_INSERT_ID(id)");
    $stmt->execute([$client_name, $client_email, $client_name]);
    $client_id = $pdo->lastInsertId();

    // Inserimento della Richiesta
    $stmt = $pdo->prepare("INSERT INTO quote_requests (client_id, service_type, technology, material, quantity_kg, referral_code_id, project_notes, privacy_consent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$client_id, $service_type, $technology, $material, $quantity_kg, $referral_code_id, htmlspecialchars($project_notes, ENT_QUOTES, 'UTF-8'), $privacy_consent ? 1 : 0]);
    $quote_id = $pdo->lastInsertId();

    // Storage sicuro degli allegati
    $upload_dir = __DIR__ . '/uploads/';
    if (!is_dir($upload_dir)) mkdir($upload_dir, 0755, true);

    $saved_attachments = [];
    foreach ($uploaded_files as $f) {
        $unique_name = generateUUIDv4() . '.' . $f['ext'];
        $dest = $upload_dir . $unique_name;

        if (move_uploaded_file($f['tmp'], $dest)) {
            $stmt = $pdo->prepare("INSERT INTO uploaded_files (quote_id, original_name, stored_name, file_path, file_size) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$quote_id, $f['orig'], $unique_name, $dest, $f['size']]);
            $saved_attachments[] = ['path' => $dest, 'name' => $f['orig']];
        } else {
            throw new Exception("Errore di scrittura sul disco del server.");
        }
    }

    $pdo->commit();

    // Invio Notifica Email (Sfrutta lo switch automatico definito in config.php)
    try {
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = SMTP_USER;
        $mail->Password   = SMTP_PASS;
        $mail->Port       = SMTP_PORT;
        $mail->CharSet    = 'UTF-8';
        if (!IS_LOCAL) $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;

        $mail->setFrom(SMTP_USER, 'PrimeFactory Automation');
        $mail->addAddress(ADMIN_EMAIL);
        $mail->isHTML(true);
        $mail->Subject = "Nuovo Preventivo Ricevuto ##{$quote_id}";
        $mail->Body    = "<h3>Nuova richiesta da {$client_name} (ID Preventivo: #{$quote_id})</h3><p>Controllare il pannello o il database per i dettagli.</p>";
        
        foreach ($saved_attachments as $sa) {
            if (file_exists($sa['path'])) $mail->addAttachment($sa['path'], $sa['name']);
        }
        $mail->send();
    } catch (Exception $e) {
        // In locale, se non hai configurato Mailtrap, non bloccare l'esperienza utente a schermo
        if (!IS_LOCAL) throw $e;
    }

    echo json_encode(['success' => true, 'message' => "La tua richiesta di preventivo #{$quote_id} è stata elaborata con successo!"]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log("Errore Form Handler: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => "Errore di elaborazione server: " . $e->getMessage()]);
}