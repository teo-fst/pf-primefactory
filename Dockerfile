FROM php:8.2-apache

# Abilita il modulo di riscrittura URL di Apache
RUN a2enmod rewrite

# Configura Apache per consentire i file .htaccess nella directory principale
RUN sed -i '/<Directory \/var\/www\/>/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf

# Installa le estensioni PHP necessarie per il database MySQL
RUN docker-php-ext-install pdo pdo_mysql

# Ottimizzazione dei pacchetti di sistema per unzip (richiesto da Composer)
RUN apt-get update && apt-get install -y unzip && rm -rf /var/lib/apt/lists/*