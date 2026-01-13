#!/bin/bash

# ===========================================
# Signify KZ - Auto Deploy Script
# ===========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════╗"
echo "║     Signify KZ - Auto Deploy Script      ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Запустите скрипт с правами root: sudo bash deploy.sh${NC}"
    exit 1
fi

# Get domain from user
echo -e "${YELLOW}Введите ваш домен (например: signify.kz):${NC}"
read -r DOMAIN

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Домен не может быть пустым!${NC}"
    exit 1
fi

echo -e "${GREEN}Домен: $DOMAIN${NC}"
echo ""

# Step 1: Update system
echo -e "${BLUE}[1/8] Обновление системы...${NC}"
apt-get update && apt-get upgrade -y

# Step 2: Install Docker
echo -e "${BLUE}[2/8] Установка Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}Docker установлен!${NC}"
else
    echo -e "${GREEN}Docker уже установлен${NC}"
fi

# Step 3: Install Docker Compose
echo -e "${BLUE}[3/8] Установка Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    apt-get install -y docker-compose-plugin
    # Create alias for docker-compose
    ln -sf /usr/libexec/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose 2>/dev/null || true
    echo -e "${GREEN}Docker Compose установлен!${NC}"
else
    echo -e "${GREEN}Docker Compose уже установлен${NC}"
fi

# Step 4: Install Git
echo -e "${BLUE}[4/8] Установка Git...${NC}"
apt-get install -y git

# Step 5: Configure environment
echo -e "${BLUE}[5/8] Настройка окружения...${NC}"

# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 32)

# Update .env file
cat > .env << EOF
# Domain
DOMAIN=$DOMAIN

# Backend URL
REACT_APP_BACKEND_URL=https://$DOMAIN

# JWT Secret
JWT_SECRET=$JWT_SECRET

# MongoDB
MONGO_URL=mongodb://mongodb:27017/signify_db
DB_NAME=signify_db

# Telegram Bot (заполните после деплоя)
TELEGRAM_BOT_TOKEN=

# Twilio (заполните после деплоя)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
EOF

echo -e "${GREEN}.env файл создан!${NC}"

# Step 6: Update nginx config with domain
echo -e "${BLUE}[6/8] Настройка Nginx...${NC}"
sed -i "s/YOURDOMAIN/$DOMAIN/g" nginx/nginx.conf
echo -e "${GREEN}Nginx настроен для домена $DOMAIN${NC}"

# Step 7: Create SSL directory
echo -e "${BLUE}[7/8] Подготовка SSL...${NC}"
mkdir -p nginx/ssl
mkdir -p /var/www/certbot

# Create temporary self-signed certificate for initial startup
echo -e "${YELLOW}Создание временного SSL сертификата...${NC}"
mkdir -p /etc/letsencrypt/live/$DOMAIN
openssl req -x509 -nodes -newkey rsa:4096 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj "/CN=$DOMAIN" \
    -days 1

# Step 8: Build and start
echo -e "${BLUE}[8/8] Сборка и запуск контейнеров...${NC}"
docker compose build --no-cache
docker compose up -d

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         ДЕПЛОЙ ЗАВЕРШЁН! 🎉              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Следующие шаги:${NC}"
echo ""
echo -e "1. Направьте DNS вашего домена ${BLUE}$DOMAIN${NC} на IP этого сервера"
echo ""
echo -e "2. После настройки DNS, получите SSL сертификат:"
echo -e "   ${BLUE}docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d $DOMAIN${NC}"
echo ""
echo -e "3. Перезапустите nginx:"
echo -e "   ${BLUE}docker compose restart nginx${NC}"
echo ""
echo -e "4. Откройте в браузере: ${BLUE}https://$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}Полезные команды:${NC}"
echo -e "  Логи:      ${BLUE}docker compose logs -f${NC}"
echo -e "  Статус:    ${BLUE}docker compose ps${NC}"
echo -e "  Рестарт:   ${BLUE}docker compose restart${NC}"
echo -e "  Стоп:      ${BLUE}docker compose down${NC}"
echo ""
