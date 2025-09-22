#!/bin/bash

# Скрипт для запуска приложения локально (без Docker)

echo "🚀 Запуск PWA приложения локально..."

# Проверяем наличие node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Устанавливаем зависимости React приложения..."
    npm install
fi

# Собираем React приложение для продакшена
echo "🔨 Собираем React приложение..."
npm run build

# Запускаем сервер в фоне
echo "📡 Запуск API сервера на порту 3001..."
node server.js &
SERVER_PID=$!

# Ждем немного, чтобы сервер запустился
sleep 2

# Запускаем статический сервер для React приложения
echo "🌐 Запуск React приложения на порту 3000..."
npx serve -s build -l 3000 &
REACT_PID=$!

echo ""
echo "✅ Оба сервиса запущены:"
echo "   - React приложение: http://localhost:3000"
echo "   - API сервер: http://localhost:3001"
echo ""
echo "📝 Для остановки нажмите Ctrl+C"

# Функция для корректного завершения процессов
cleanup() {
    echo ""
    echo "🛑 Завершение процессов..."
    kill $SERVER_PID $REACT_PID 2>/dev/null
    exit 0
}

# Обработка сигналов завершения
trap cleanup SIGTERM SIGINT

# Ждем завершения любого из процессов
wait $SERVER_PID $REACT_PID
