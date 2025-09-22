const CACHE_NAME = "photo-pwa-v2";
const urlsToCache = [
  "/",
  "/static/js/bundle.js",
  "/static/css/main.css",
  "/manifest.json",
  "/favicon.ico",
  "/logo192.png",
  "/logo512.png",
];

// Установка Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Кеширование файлов");
      return cache.addAll(urlsToCache);
    })
  );
});

// Активация Service Worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Удаление старого кеша:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Перехват запросов
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Возвращаем кешированную версию, если она есть
      if (response) {
        return response;
      }

      // Иначе делаем запрос к сети
      return fetch(event.request)
        .then((response) => {
          // Проверяем, что получили валидный ответ
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // Клонируем ответ
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Если запрос не удался и это HTML страница, показываем офлайн страницу
          if (event.request.destination === "document") {
            return caches.match("/");
          }
        });
    })
  );
});

// Обработка push уведомлений (для будущего использования)
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "Новое уведомление",
    icon: "/logo192.png",
    badge: "/logo192.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  };

  event.waitUntil(self.registration.showNotification("Photo PWA", options));
});

// Обработка клика по уведомлению
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(clients.openWindow("/"));
});

// Обработка сообщений от главного потока
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  // Обработка запросов на разрешения
  if (event.data && event.data.type === "REQUEST_PERMISSIONS") {
    handlePermissionRequest(event);
  }
});

// Функция для обработки запросов разрешений
async function handlePermissionRequest(event) {
  try {
    const permissions = event.data.permissions || [];
    const results = {};

    for (const permission of permissions) {
      if (permission === "camera") {
        // Для камеры используем navigator.permissions.query если доступно
        if (self.navigator && self.navigator.permissions) {
          try {
            const result = await self.navigator.permissions.query({
              name: "camera",
            });
            results.camera = result.state;
          } catch (error) {
            console.log("Permissions API не поддерживается для камеры");
            results.camera = "prompt";
          }
        } else {
          results.camera = "prompt";
        }
      }

      if (permission === "persistent-storage") {
        if (
          self.navigator &&
          self.navigator.storage &&
          self.navigator.storage.persist
        ) {
          try {
            const persistent = await self.navigator.storage.persist();
            results["persistent-storage"] = persistent ? "granted" : "denied";
          } catch (error) {
            results["persistent-storage"] = "denied";
          }
        } else {
          results["persistent-storage"] = "denied";
        }
      }
    }

    // Отправляем результаты обратно
    event.ports[0].postMessage({
      type: "PERMISSIONS_RESULT",
      results: results,
    });
  } catch (error) {
    console.error("Ошибка при проверке разрешений:", error);
    event.ports[0].postMessage({
      type: "PERMISSIONS_ERROR",
      error: error.message,
    });
  }
}

// Обработка фоновой синхронизации (для будущего использования)
self.addEventListener("sync", (event) => {
  if (event.tag === "photo-upload") {
    event.waitUntil(handleBackgroundPhotoUpload());
  }
});

// Функция для обработки фоновой загрузки фото
async function handleBackgroundPhotoUpload() {
  try {
    console.log("Выполняется фоновая синхронизация фотографий");

    // Здесь можно добавить логику для отправки фото, которые не были загружены
    // когда было отключено соединение

    // Уведомляем главный поток о завершении синхронизации
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: "SYNC_COMPLETE",
        tag: "photo-upload",
      });
    });
  } catch (error) {
    console.error("Ошибка фоновой синхронизации:", error);
  }
}

// Обработка ошибок
self.addEventListener("error", (event) => {
  console.error("Service Worker error:", event.error);
});

// Обработка необработанных отклонений промисов
self.addEventListener("unhandledrejection", (event) => {
  console.error("Service Worker unhandled promise rejection:", event.reason);
  event.preventDefault();
});
