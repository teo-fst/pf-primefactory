# Deploy su Hostinger Business Shared Hosting

1. Carica i contenuti della cartella public_html sul percorso pubblico del dominio.
2. Crea il database MySQL in hPanel e aggiorna i valori di connessione in .env (o in config.php se preferisci hard-code).
3. Esegui il file database/schema.sql nel database tramite phpMyAdmin o terminale MySQL.
4. Assicurati che la cartella public_html/uploads sia scrivibile dal web server.
5. Per SMTP, imposta le credenziali Hostinger reali nelle variabili d’ambiente o in config.php.
6. Verifica che il sito sia raggiungibile su HTTPS.
