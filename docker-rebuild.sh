#!/bin/bash

# Скрипт для быстрой пересборки Docker образа с сохранением кэша зависимостей

echo "🚀 Начинаем пересборку приложения..."

# Останавливаем контейнеры если они запущены
echo "⏹️  Останавливаем текущие контейнеры..."
docker-compose down

# Пересобираем только измененные слои
echo "🔨 Пересобираем образ..."
docker-compose build --no-cache --pull

# Запускаем контейнеры
echo "▶️  Запускаем контейнеры..."
docker-compose up -d

# Показываем статус
echo "📊 Статус контейнеров:"
docker-compose ps

echo "✅ Готово! Приложение доступно на:"
echo "   - React: http://localhost:3000"
echo "   - API: http://localhost:3001"
echo ""
echo "📝 Для просмотра логов используйте: docker-compose logs -f"
