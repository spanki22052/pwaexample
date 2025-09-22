# 🐳 Docker Setup для Photo PWA

## Быстрый запуск

### 1. Сборка и запуск через Docker Compose

```bash
# Сборка и запуск
docker-compose up --build

# Запуск в фоновом режиме
docker-compose up -d --build
```

### 2. Остановка

```bash
docker-compose down
```

## Доступ к приложению

- **React приложение**: http://localhost:3000
- **API сервер**: http://localhost:3001

## Что делает Docker контейнер

1. **Устанавливает зависимости** для React приложения и Node.js сервера
2. **Собирает React приложение** для продакшена
3. **Запускает оба сервиса одновременно**:
   - Node.js сервер на порту 3001
   - React приложение на порту 3000
4. **Монтирует папку uploads** для сохранения загруженных фотографий

## Структура файлов

- `Dockerfile` - конфигурация Docker контейнера
- `docker-compose.yml` - настройки для запуска через Docker Compose
- `.dockerignore` - файлы, исключаемые из Docker контекста

## Устранение проблем

### Если порты заняты

Измените порты в `docker-compose.yml`:

```yaml
ports:
  - "3002:3000" # React приложение
  - "3003:3001" # Node.js сервер
```

### Если нужно пересобрать

```bash
docker-compose down
docker-compose up --build --force-recreate
```

### Просмотр логов

```bash
docker-compose logs -f
```
