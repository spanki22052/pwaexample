# Многоэтапная сборка для оптимизации
FROM node:18-alpine AS dependencies

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем только package.json файлы для установки зависимостей
# Это позволяет кэшировать слой с node_modules если зависимости не изменились
COPY package*.json ./
COPY server-package.json ./

# Устанавливаем зависимости для React приложения
RUN npm ci --only=production --silent

# Устанавливаем serve глобально для статического хостинга
RUN npm install -g serve

# Устанавливаем зависимости для сервера
RUN mkdir -p server && cp server-package.json server/package.json && cd server && npm ci --only=production --silent

# Этап сборки приложения
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем зависимости из предыдущего этапа
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/server ./server

# Копируем package.json файлы
COPY package*.json ./
COPY server-package.json ./

# Копируем исходный код (это будет пересобираться при изменениях кода)
COPY public/ ./public/
COPY src/ ./src/
COPY server.js ./
COPY start.sh ./

# Собираем React приложение для продакшена
RUN npm run build

# Финальный этап - production образ
FROM node:18-alpine AS production

WORKDIR /app

# Копируем только необходимые файлы для продакшена
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/server ./server
COPY --from=builder /app/build ./build
COPY --from=builder /app/server.js ./
COPY --from=builder /app/start.sh ./
COPY --from=builder /app/package*.json ./

# Создаем папку для загруженных файлов
RUN mkdir -p uploads

# Делаем скрипт запуска исполняемым
RUN chmod +x /app/start.sh

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app
USER nextjs

# Открываем порты
EXPOSE 3000 3001

# Запускаем оба сервиса
CMD ["/app/start.sh"]
