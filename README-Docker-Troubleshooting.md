# 🐛 Решение проблем Docker

## ❌ Ошибка 'ContainerConfig'

### Проблема

```
ERROR: 'ContainerConfig'
KeyError: 'ContainerConfig'
```

### Причина

Эта ошибка возникает из-за проблем с именованными томами в Docker Compose или поврежденного кэша Docker.

### Решение

#### 1. Быстрое решение - Упрощенная конфигурация

Используйте упрощенную версию без именованных томов:

```bash
# Используйте упрощенную конфигурацию
docker-compose -f docker-compose.dev.yml up -d
```

#### 2. Очистка Docker кэша

```bash
# Остановить все контейнеры
docker-compose down -v

# Очистить системный кэш
docker system prune -a -f

# Удалить все тома
docker volume prune -f

# Пересобрать образы
docker-compose build --no-cache
```

#### 3. Полная переустановка Docker (крайний случай)

Если проблема продолжается, переустановите Docker Desktop.

## 🚀 Альтернативные способы запуска

### 1. Локальный запуск (без Docker)

```bash
# Простой способ запуска без Docker
./start-local.sh
```

### 2. Ручной запуск

```bash
# Установка зависимостей
npm install

# Сборка React приложения
npm run build

# Запуск сервера API (в одном терминале)
node server.js

# Запуск статического сервера (в другом терминале)
npx serve -s build -l 3000
```

### 3. Разработческий режим

```bash
# API сервер (в одном терминале)
node server.js

# React dev server (в другом терминале)
npm start
```

## 🔧 Диагностика проблем

### Проверка Docker

```bash
# Проверить статус Docker
docker info

# Проверить запущенные контейнеры
docker ps

# Проверить образы
docker images

# Проверить тома
docker volume ls
```

### Логи контейнеров

```bash
# Посмотреть логи
docker-compose logs

# Логи в реальном времени
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs photo-pwa
```

## 🛠️ Исправление конфигурации

### Упрощенный docker-compose.yml

```yaml
version: "3.8"

services:
  photo-pwa:
    build: .
    ports:
      - "3000:3000"
      - "3001:3001"
    volumes:
      - ./uploads:/app/uploads
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

### Минимальный Dockerfile

```dockerfile
FROM node:18-alpine
WORKDIR /app

# Копируем package.json
COPY package*.json ./
RUN npm install

# Копируем server-package.json
COPY server-package.json ./
RUN mkdir server && cp server-package.json server/package.json
RUN cd server && npm install

# Копируем код
COPY . .

# Собираем приложение
RUN npm run build

# Устанавливаем serve
RUN npm install -g serve

EXPOSE 3000 3001
CMD ["./start.sh"]
```

## 📊 Мониторинг ресурсов

### Использование ресурсов

```bash
# Статистика контейнеров
docker stats

# Использование диска
docker system df

# Детальная информация
docker system df -v
```

### Очистка места

```bash
# Очистить неиспользуемые образы
docker image prune -f

# Очистить неиспользуемые контейнеры
docker container prune -f

# Очистить неиспользуемые тома
docker volume prune -f

# Полная очистка
docker system prune -a -f
```

## 🔄 Скрипты для автоматизации

### docker-quick-rebuild.sh

Обновленный скрипт с проверками:

```bash
#!/bin/bash
echo "⚡ Быстрая пересборка приложения..."

# Проверяем Docker
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker не запущен. Запустите Docker Desktop."
    exit 1
fi

# Останавливаем и очищаем
docker-compose down 2>/dev/null
docker system prune -f > /dev/null 2>&1

# Пересобираем и запускаем
docker-compose build --no-cache
docker-compose up -d

echo "✅ Готово! http://localhost:3000"
```

## 🚨 Частые проблемы

### 1. Docker не запущен

```
Cannot connect to the Docker daemon
```

**Решение:** Запустите Docker Desktop

### 2. Порты заняты

```
Error: Port 3000 is already in use
```

**Решение:**

```bash
# Найти процесс
lsof -i :3000

# Остановить процесс
kill -9 <PID>
```

### 3. Недостаточно места

```
no space left on device
```

**Решение:**

```bash
# Очистить Docker
docker system prune -a -f

# Проверить место
df -h
```

### 4. Проблемы с правами доступа

```
Permission denied
```

**Решение:**

```bash
# Исправить права на uploads
sudo chown -R $USER:$USER uploads/

# Или пересоздать папку
rm -rf uploads && mkdir uploads
```

## 📋 Чек-лист диагностики

- [ ] Docker Desktop запущен
- [ ] Достаточно места на диске (>2GB)
- [ ] Порты 3000 и 3001 свободны
- [ ] Файлы package.json корректны
- [ ] Папка uploads существует
- [ ] Права доступа корректны
- [ ] Нет конфликтующих контейнеров

## 🆘 Экстренное восстановление

Если ничего не помогает:

```bash
# 1. Полная очистка Docker
docker system prune -a -f --volumes

# 2. Удалить все образы проекта
docker rmi $(docker images "pwaexample*" -q) 2>/dev/null

# 3. Запуск без Docker
./start-local.sh
```
