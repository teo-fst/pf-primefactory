# PrimeFactory

Sito vetrina e modulo preventivi per progetto PrimeFactory.

## Struttura

- `public_html/`: root pubblica del sito.
- `docker-compose.yml`: definizione servizi Web e database.
- `Dockerfile`: immagine Apache/PHP 8.2.
- `.env`: variabili ambiente locali.
- `database/schema.sql`: schema MySQL con tabelle referral e preventivi.

## Avvio in locale

1. Assicurati che Docker sia avviato.
2. Esegui `docker compose up --build` dalla root del progetto.
3. Apri `http://localhost:8080`.

## Note

- Il container usa `public_html` come document root.
- Il database viene inizializzato con `database/schema.sql`.
- Il modulo verifica referral su `verify_referral.php`.
- Gli upload vengono salvati in `public_html/uploads` con nomi UUID.
