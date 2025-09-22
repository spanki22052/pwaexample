#!/bin/bash

# Скрипт для максимально быстрой пересборки только кода приложения
# Использует кэш Docker слоев для node_modules

echo "⚡ Быстрая пересборка приложения..."

# Проверяем, запущен ли Docker
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker не запущен. Запустите Docker Desktop и попробуйте снова."
    exit 1
fi

# Останавливаем контейнеры
echo "⏹️  Останавливаем контейнеры..."
docker-compose down 2>/dev/null || echo "Контейнеры уже остановлены"

# Очищаем проблемные тома если есть
echo "🧹 Очищаем кэш..."
docker system prune -f > /dev/null 2>&1

# Пересобираем образ с использованием кэша
echo "🔨 Пересобираем с кэшем зависимостей..."
docker-compose build --no-cache

# Запускаем контейнеры
echo "▶️  Запускаем контейнеры..."
docker-compose up -d

# Показываем статус
echo "📊 Статус:"
docker-compose ps

echo "✅ Быстрая пересборка завершена!"
echo "   - React: http://localhost:3000"
echo "   - API: http://localhost:3001"
