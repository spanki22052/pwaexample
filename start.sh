#!/bin/sh
# Запускаем сервер в фоне
cd server && npm start &
SERVER_PID=$!

# Запускаем React приложение
npm start &
REACT_PID=$!

# Функция для корректного завершения процессов
cleanup() {
    echo "Завершение процессов..."
    kill $SERVER_PID $REACT_PID 2>/dev/null
    exit 0
}

# Обработка сигналов завершения
trap cleanup SIGTERM SIGINT

# Ждем завершения любого из процессов
wait $SERVER_PID $REACT_PID
