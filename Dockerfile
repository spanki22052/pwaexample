# Используем Node.js 18 как базовый образ
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json файлы для установки зависимостей
COPY package*.json ./
COPY server-package.json ./server-package.json

# Устанавливаем зависимости для React приложения
RUN npm install

# Устанавливаем зависимости для сервера
RUN mkdir -p server && cp server-package.json server/package.json && cd server && npm install

# Копируем исходный код
COPY . .

# Копируем server.js в папку server
RUN cp server.js server/

# Создаем папку для загруженных файлов
RUN mkdir -p uploads

# Собираем React приложение для продакшена
RUN npm run build

# Открываем порты
EXPOSE 3000 3001

# Копируем скрипт запуска
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Запускаем оба сервиса
CMD ["/app/start.sh"]
