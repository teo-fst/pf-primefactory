FROM php:8.2-apache

# Abilita il modulo di riscrittura URL di Apache
RUN a2enmod rewrite

# Configura Apache per consentire i file .htaccess nella directory principale
RUN sed -i '/<Directory \/var\/www\/>/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf

# Installa le estensioni PHP necessarie per il database MySQL
RUN apt-get update && apt-get install -y unzip zip git && rm -rf /var/lib/apt/lists/*

# Installa Composer e dipendenze PHP globali
RUN php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');" \
    && php composer-setup.php --install-dir=/usr/local/bin --filename=composer \
    && rm composer-setup.php

WORKDIR /var/www
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-interaction

WORKDIR /var/www/html
RUN docker-php-ext-install pdo pdo_mysql

# Ottimizzazione dei pacchetti di sistema per unzip (richiesto da Composer)
RUN apt-get update && apt-get install -y unzip && rm -rf /var/lib/apt/lists/*