<?php
header('Content-Type: application/json');
require_once __DIR__ . '/config.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../vendor/autoload.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Metodo non consentito.']);
    exit;
}

$clientName = sanitizeText($_POST['client_name'] ?? '');
$clientEmail = filter_var(trim($_POST['client_email'] ?? ''), FILTER_VALIDATE_EMAIL);
$referralCode = strtoupper(sanitizeText($_POST['referral_code'] ?? ''));
$serviceType = sanitizeText($_POST['service_type'] ?? '');
$preferredTechnology = sanitizeText($_POST['preferred_technology'] ?? '');
$preferredMaterial = sanitizeText($_POST['preferred_material'] ?? '');
$givedMaterial = sanitizeText($_POST['gived_material'] ?? '');
$quantityPlastic = filter_var($_POST['quantity_plastic'] ?? null, FILTER_VALIDATE_FLOAT);
$projectNotes = sanitizeText($_POST['project_notes'] ?? '');
$privacyConsent = isset($_POST['privacy_consent']) ? (int) $_POST['privacy_consent'] : 0;

if (mb_strlen($clientName) < 3) {
    echo json_encode(['success' => false, 'message' => 'Inserisci un nome o una ragione sociale valida.']);
    exit;
}

if (!$clientEmail) {
    echo json_encode(['success' => false, 'message' => 'L’indirizzo email non è valido.']);
    exit;
}

if (!in_array($serviceType, ['ready', 'needs_cad', 'give_plastic'], true)) {
    echo json_encode(['success' => false, 'message' => 'Seleziona una tipologia di servizio.']);
    exit;
}

if ($serviceType === 'give_plastic' && ($quantityPlastic === false || $quantityPlastic < 1 || $quantityPlastic > 20)) {
    echo json_encode(['success' => false, 'message' => 'La stima del peso deve essere compresa tra 1 e 20 kg.']);
    exit;
}

if ($projectNotes === '') {
    echo json_encode(['success' => false, 'message' => 'Le note sul progetto sono obbligatorie.']);
    exit;
}

if ((int) $privacyConsent !== 1) {
    echo json_encode(['success' => false, 'message' => 'Per procedere devi accettare il consenso privacy.']);
    exit;
}

$allowedExtensions = ['png', 'jpg', 'jpeg'];
$allowedMimeTypes = ['image/png', 'image/jpeg', 'image/pjpeg'];
$maxFileSize = 35 * 1024 * 1024;

try {
    ensureUploadDirectory();
    $pdo = getDBConnection();
    $pdo->beginTransaction();

    $stmt = $pdo->prepare('SELECT id FROM clients WHERE email = :email LIMIT 1');
    $stmt->execute(['email' => $clientEmail]);
    $clientId = $stmt->fetchColumn();

    if (!$clientId) {
        $stmt = $pdo->prepare('INSERT INTO clients (name, email) VALUES (:name, :email)');
        $stmt->execute(['name' => $clientName, 'email' => $clientEmail]);
        $clientId = (int) $pdo->lastInsertId();
    }

    $referralId = null;
    if ($referralCode !== '') {
        $stmt = $pdo->prepare('SELECT id FROM referral_codes WHERE code_value = :code AND is_active = 1 LIMIT 1');
        $stmt->execute(['code' => $referralCode]);
        $referralId = $stmt->fetchColumn();
    }

    $stmt = $pdo->prepare('INSERT INTO quotes (client_id, service_type, preferred_technology, preferred_material, gived_material, quantity_plastic, referral_code_id, project_notes, privacy_consent) VALUES (:client_id, :service_type, :preferred_technology, :preferred_material, :gived_material, :quantity_plastic, :referral_code_id, :project_notes, :privacy_consent)');
    $stmt->execute([
        'client_id' => $clientId,
        'service_type' => $serviceType,
        'preferred_technology' => $serviceType !== 'give_plastic' ? $preferredTechnology : null,
        'preferred_material' => $serviceType !== 'give_plastic' ? $preferredMaterial : null,
        'gived_material' => $serviceType === 'give_plastic' ? $givedMaterial : null,
        'quantity_plastic' => $serviceType === 'give_plastic' ? $quantityPlastic : null,
        'referral_code_id' => $referralId,
        'project_notes' => $projectNotes,
        'privacy_consent' => 1,
    ]);
    $quoteId = (int) $pdo->lastInsertId();

    $uploadedFiles = [];
    if (!empty($_FILES['project_files']['name'][0])) {
        foreach ($_FILES['project_files']['tmp_name'] as $index => $tmpName) {
            if ($_FILES['project_files']['error'][$index] !== UPLOAD_ERR_OK) {
                continue;
            }

            $originalName = $_FILES['project_files']['name'][$index];
            $fileSize = (int) $_FILES['project_files']['size'][$index];
            $mimeType = $_FILES['project_files']['type'][$index] ?: 'application/octet-stream';
            $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

            if (!in_array($extension, $allowedExtensions, true) || !in_array($mimeType, $allowedMimeTypes, true)) {
                throw new Exception('Sono ammessi solo file immagine (.png, .jpg, .jpeg).');
            }
            if ($fileSize > $maxFileSize) {
                throw new Exception('Il file supera i 35 MB massimi consentiti.');
            }

            $storedName = generateUuid() . '.' . $extension;
            $targetPath = UPLOAD_DIR . $storedName;
            if (!move_uploaded_file($tmpName, $targetPath)) {
                throw new Exception('Impossibile salvare il file caricato.');
            }

            $stmt = $pdo->prepare('INSERT INTO uploaded_files (quote_id, original_name_encrypted, uuid_name, file_path, mime_type, file_size) VALUES (:quote_id, :original_name_encrypted, :uuid_name, :file_path, :mime_type, :file_size)');
            $stmt->execute([
                'quote_id' => $quoteId,
                'original_name_encrypted' => encryptFileName($originalName),
                'uuid_name' => $storedName,
                'file_path' => $targetPath,
                'mime_type' => $mimeType,
                'file_size' => $fileSize,
            ]);

            $uploadedFiles[] = ['path' => $targetPath, 'name' => $originalName];
        }
    }

    $pdo->commit();

    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = MAIL_HOST;
    $mail->SMTPAuth = true;
    $mail->Username = MAIL_USERNAME;
    $mail->Password = MAIL_PASSWORD;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;
    $mail->CharSet = 'UTF-8';

    try {
        $mail->setFrom(MAIL_FROM, 'PrimeFactory Preventivi');
        $mail->addAddress(MAIL_TO);
        $mail->addReplyTo($clientEmail, $clientName);
        foreach ($uploadedFiles as $file) {
            $mail->addAttachment($file['path'], $file['name']);
        }
        $mail->isHTML(true);
        $mail->Subject = 'Nuova richiesta preventivo #' . $quoteId . ' da ' . $clientName;
        $mail->Body = '<h2>Nuova richiesta preventivo</h2><p><strong>Cliente:</strong> ' . htmlspecialchars($clientName) . '</p><p><strong>Email:</strong> ' . htmlspecialchars($clientEmail) . '</p><p><strong>Servizio:</strong> ' . htmlspecialchars($serviceType) . '</p><p><strong>Note:</strong> ' . nl2br(htmlspecialchars($projectNotes)) . '</p>';
        $mail->send();
    } catch (Exception $e) {
        error_log('[Mail Admin] ' . $e->getMessage());
    }

    try {
        $mail->clearAddresses();
        $mail->clearAttachments();
        $mail->clearReplyTos();
        $mail->addAddress($clientEmail, $clientName);
        $mail->Subject = 'Ricevuta richiesta preventivo PrimeFactory #' . $quoteId;
        $mail->Body = '<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1e1e1e;"><h2 style="color:#3c1a47;">Ciao ' . htmlspecialchars($clientName) . '!</h2><p>Abbiamo ricevuto la tua richiesta. Il team di PrimeFactory la valuterà entro 24 ore.</p><p><strong>Paco</strong> ti assicura che il processo sarà semplice e trasparente.</p><p>Hai allegato ' . count($uploadedFiles) . ' file immagine/i.</p><p style="font-size:12px;color:#666;">I tuoi dati sono trattati in accordo al GDPR e i file sono protetti con identificazione UUID.</p></div>';
        $mail->send();
    } catch (Exception $e) {
        error_log('[Mail Client] ' . $e->getMessage());
    }

    echo json_encode(['success' => true, 'message' => 'Richiesta inviata con successo. Riceverai una conferma via email entro pochi minuti.']);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('[Form Handler] ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Si è verificato un errore durante l’elaborazione: ' . $e->getMessage()]);
}
