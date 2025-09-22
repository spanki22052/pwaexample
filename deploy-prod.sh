#!/bin/bash

echo "🚀 Начинаем деплой на продакшн..."

# Устанавливаем переменные окружения для продакшн
export NODE_ENV=production
export REACT_APP_ENV=production
export REACT_APP_API_URL=http://109.205.212.29
export REACT_APP_WS_URL=ws://109.205.212.29

echo "📦 Сборка приложения для продакшн..."
npm run build

echo "🐳 Пересборка Docker образов для продакшн..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

echo "✅ Деплой завершен!"
echo "🌐 Приложение доступно на: http://109.205.212.29"
echo "📡 API доступен на: http://109.205.212.29/api/upload"
