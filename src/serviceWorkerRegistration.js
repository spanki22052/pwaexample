// Этот файл можно использовать для регистрации Service Worker
// и сообщения о том, что приложение готово к работе офлайн

const isLocalhost = Boolean(
  window.location.hostname === "localhost" ||
    // [::1] - это IPv6 localhost адрес.
    window.location.hostname === "[::1]" ||
    // 127.0.0.0/8 считаются localhost для IPv4.
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

// Конфигурация для регистрации Service Worker

export function register(config) {
  if ("serviceWorker" in navigator) {
    // URL конструктор доступен во всех браузерах, которые поддерживают SW.
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      // Наш SW не будет работать, если PUBLIC_URL находится на другом домене
      // от того, где обслуживается наша страница. Это может произойти, если
      // CDN используется для обслуживания assets; см. https://github.com/facebook/create-react-app/issues/2374
      return;
    }

    window.addEventListener("load", () => {
      const swUrl = `${process.env.PUBLIC_URL}/sw.js`;

      if (isLocalhost) {
        // Это выполняется на localhost. Давайте проверим, есть ли service worker файл или нет.
        checkValidServiceWorker(swUrl, config);

        // Добавляем дополнительное логирование в localhost, указывая разработчикам
        // что SW не работает из-за кеширования. См. https://github.com/facebook/create-react-app/issues/1860
        navigator.serviceWorker.ready.then(() => {
          console.log(
            "Это веб-приложение обслуживается кешем в первую очередь. " +
              "Узнайте больше на https://bit.ly/CRA-PWA"
          );
        });
      } else {
        // Не localhost. Просто регистрируем service worker
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === "installed") {
            if (navigator.serviceWorker.controller) {
              // В этот момент, старый контент будет очищен и
              // новый контент будет добавлен в кеш.
              // Это хук для отображения "Новый контент доступен; пожалуйста, обновите."
              // сообщения в вашем веб-приложении.
              console.log(
                "Новый контент доступен и будет использован, когда все " +
                  "вкладки для этой страницы будут закрыты. См. https://bit.ly/CRA-PWA."
              );

              // Выполняем callback
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // В этот момент, все было кешировано.
              // Это хук для отображения "Контент кеширован для офлайн использования."
              // сообщения.
              console.log("Контент кеширован для офлайн использования.");

              // Выполняем callback
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error("Ошибка во время регистрации service worker:", error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  // Проверяем, есть ли service worker файл или нет.
  fetch(swUrl, {
    headers: { "Service-Worker": "script" },
  })
    .then((response) => {
      // Убеждаемся, что service worker существует, и что мы действительно получаем JS файл.
      const contentType = response.headers.get("content-type");
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf("javascript") === -1)
      ) {
        // Service worker не найден. Вероятно, это другая приложение. Или
        // pre-cache не включен. Или service worker файл не существует.
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker найден. Продолжаем как обычно.
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log(
        "Нет интернет-соединения. Приложение работает в офлайн режиме."
      );
    });
}

export function unregister() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
