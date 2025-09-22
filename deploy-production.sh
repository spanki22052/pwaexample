#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Проверяем, что мы в правильной директории
if [ ! -f "package.json" ]; then
    error "Файл package.json не найден. Убедитесь, что вы находитесь в корне проекта."
    exit 1
fi

log "🚀 Начинаем деплой на продакшн сервер 109.205.212.29..."

# Устанавливаем переменные окружения для продакшн
export NODE_ENV=production
export REACT_APP_ENV=production
export REACT_APP_API_URL=http://109.205.212.29
export REACT_APP_WS_URL=ws://109.205.212.29

log "📋 Переменные окружения установлены:"
log "   NODE_ENV=$NODE_ENV"
log "   REACT_APP_ENV=$REACT_APP_ENV"
log "   REACT_APP_API_URL=$REACT_APP_API_URL"
log "   REACT_APP_WS_URL=$REACT_APP_WS_URL"

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    error "Docker не установлен или недоступен"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose не установлен или недоступен"
    exit 1
fi

# Проверяем наличие npm
if ! command -v npm &> /dev/null; then
    error "npm не установлен или недоступен"
    exit 1
fi

log "📦 Установка зависимостей..."
npm ci

log "🔨 Сборка приложения для продакшн..."
npm run build

if [ $? -ne 0 ]; then
    error "Ошибка при сборке приложения"
    exit 1
fi

success "Приложение успешно собрано"

log "🐳 Остановка существующих контейнеров..."
docker-compose -f docker-compose.prod.yml down

log "🔧 Пересборка Docker образов для продакшн..."
docker-compose -f docker-compose.prod.yml build --no-cache

if [ $? -ne 0 ]; then
    error "Ошибка при сборке Docker образов"
    exit 1
fi

log "🚀 Запуск контейнеров..."
docker-compose -f docker-compose.prod.yml up -d

if [ $? -ne 0 ]; then
    error "Ошибка при запуске контейнеров"
    exit 1
fi

# Ждем немного для запуска сервисов
log "⏳ Ожидание запуска сервисов..."
sleep 10

# Проверяем статус контейнеров
log "📊 Статус контейнеров:"
docker-compose -f docker-compose.prod.yml ps

# Проверяем доступность сервисов
log "🔍 Проверка доступности сервисов..."

# Проверяем React приложение
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    success "React приложение доступно на порту 3000"
else
    warning "React приложение может быть еще не готово на порту 3000"
fi

# Проверяем API сервер
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/files | grep -q "200"; then
    success "API сервер доступен на порту 3001"
else
    warning "API сервер может быть еще не готов на порту 3001"
fi

success "✅ Деплой завершен!"
log "🌐 Приложение будет доступно на: http://109.205.212.29"
log "📡 API будет доступен на: http://109.205.212.29:3001/api/upload"
log ""
log "📋 Полезные команды:"
log "   Просмотр логов: docker-compose -f docker-compose.prod.yml logs -f"
log "   Остановка: docker-compose -f docker-compose.prod.yml down"
log "   Перезапуск: docker-compose -f docker-compose.prod.yml restart"
