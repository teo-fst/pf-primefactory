CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    loyalty_points INT DEFAULT 0,
    magic_link_token VARCHAR(64) DEFAULT NULL,
    magic_link_expires_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS referral_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code_value VARCHAR(50) NOT NULL UNIQUE,
    discount_amount DECIMAL(10, 2) NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    service_type ENUM('ready', 'needs_cad', 'give_plastic') NOT NULL,
    preferred_technology ENUM('fdm', 'resina', 'non_saprei') DEFAULT NULL,
    preferred_material ENUM('pla_riciclato', 'pla', 'petg', 'abs', 'resina_standard', 'resina_tech', 'non_saprei') DEFAULT NULL,
    gived_material ENUM('pla', 'petg', 'abs', 'from_home', 'non_saprei') DEFAULT NULL,
    quantity_plastic DECIMAL(5, 2) DEFAULT NULL,
    referral_code_id INT DEFAULT NULL,
    project_notes TEXT NOT NULL,
    privacy_consent TINYINT(1) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_quotes_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    CONSTRAINT fk_quotes_referral FOREIGN KEY (referral_code_id) REFERENCES referral_codes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS uploaded_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quote_id INT NOT NULL,
    original_name_encrypted TEXT NOT NULL,
    uuid_name VARCHAR(64) NOT NULL UNIQUE,
    file_path VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_files_quote FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserimento codici di test iniziali
INSERT IGNORE INTO referral_codes (code_value, discount_amount, is_active) VALUES 
('AMICO-5671', 5.00, 1),
('SCONTO-5', 5.00, 1);