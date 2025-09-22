#!/bin/sh

# Проверяем, что все необходимые файлы существуют
if [ ! -d "build" ]; then
    echo "❌ Ошибка: папка build не найдена. Запустите npm run build"
    exit 1
fi

if [ ! -f "server.js" ]; then
    echo "❌ Ошибка: server.js не найден"
    exit 1
fi

echo "🚀 Запуск Photo PWA приложения..."

npm run build &

# Запускаем сервер в фоне
echo "📡 Запуск API сервера на порту 3001..."
node server.js &
SERVER_PID=$!

# Ждем немного, чтобы сервер запустился
sleep 2

# Запускаем статический сервер для React приложения
echo "🌐 Запуск React приложения на порту 3000..."
npm start &
REACT_PID=$!

echo "✅ Оба сервиса запущены:"
echo "   - React приложение: http://localhost:3000"
echo "   - API сервер: http://localhost:3001"

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
