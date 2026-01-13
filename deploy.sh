#!/bin/bash

# ===========================================
# 2tick.kz - Auto Deploy Script
# ===========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="2tick.kz"

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════╗"
echo "║       2tick.kz - Auto Deploy Script      ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Запустите скрипт с правами root: sudo bash deploy.sh${NC}"
    exit 1
fi

echo -e "${GREEN}Домен: $DOMAIN${NC}"
echo ""

# Step 1: Update system
echo -e "${BLUE}[1/7] Обновление системы...${NC}"
apt-get update && apt-get upgrade -y

# Step 2: Install Docker
echo -e "${BLUE}[2/7] Установка Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}Docker установлен!${NC}"
else
    echo -e "${GREEN}Docker уже установлен${NC}"
fi

# Step 3: Install Docker Compose
echo -e "${BLUE}[3/7] Установка Docker Compose...${NC}"
apt-get install -y docker-compose-plugin
echo -e "${GREEN}Docker Compose установлен!${NC}"

# Step 4: Copy env file
echo -e "${BLUE}[4/7] Настройка окружения...${NC}"
cp .env.production .env
echo -e "${GREEN}.env файл создан!${NC}"

# Step 5: Create SSL directory and temp certificate
echo -e "${BLUE}[5/7] Подготовка SSL...${NC}"
mkdir -p nginx/ssl
mkdir -p /var/www/certbot
mkdir -p /etc/letsencrypt/live/$DOMAIN

# Create temporary self-signed certificate
openssl req -x509 -nodes -newkey rsa:4096 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj "/CN=$DOMAIN" \
    -days 1 2>/dev/null

echo -e "${GREEN}Временный SSL сертификат создан${NC}"

# Step 6: Build and start
echo -e "${BLUE}[6/7] Сборка контейнеров (это займёт 5-10 минут)...${NC}"
docker compose build

# Step 7: Start
echo -e "${BLUE}[7/7] Запуск...${NC}"
docker compose up -d

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         ДЕПЛОЙ ЗАВЕРШЁН! 🎉              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Следующие шаги:${NC}"
echo ""
echo -e "1. ${BLUE}Настройте DNS:${NC}"
echo -e "   A-запись: ${GREEN}2tick.kz${NC} → ${GREEN}IP_вашего_сервера${NC}"
echo -e "   A-запись: ${GREEN}www.2tick.kz${NC} → ${GREEN}IP_вашего_сервера${NC}"
echo ""
echo -e "2. ${BLUE}Подождите 5-10 минут пока DNS обновится${NC}"
echo ""
echo -e "3. ${BLUE}Получите SSL сертификат:${NC}"
echo -e "   ${GREEN}docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d 2tick.kz -d www.2tick.kz --email ваш@email.com --agree-tos${NC}"
echo ""
echo -e "4. ${BLUE}Перезапустите nginx:${NC}"
echo -e "   ${GREEN}docker compose restart nginx${NC}"
echo ""
echo -e "5. ${BLUE}Откройте:${NC} ${GREEN}https://2tick.kz${NC}"
echo ""
echo -e "${YELLOW}Полезные команды:${NC}"
echo -e "  Логи:      ${GREEN}docker compose logs -f${NC}"
echo -e "  Статус:    ${GREEN}docker compose ps${NC}"
echo -e "  Рестарт:   ${GREEN}docker compose restart${NC}"
echo -e "  Стоп:      ${GREEN}docker compose down${NC}"
echo ""
