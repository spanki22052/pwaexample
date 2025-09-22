// Утилиты для работы с разрешениями PWA

/**
 * Проверяет поддержку Permissions API
 */
export const isPermissionsAPISupported = () => {
  return "permissions" in navigator;
};

/**
 * Проверяет поддержку getUserMedia (камера/микрофон)
 */
export const isGetUserMediaSupported = () => {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

/**
 * Проверяет текущий статус разрешения
 * @param {string} permission - Название разрешения ('camera', 'microphone', 'notifications', etc.)
 * @returns {Promise<string>} - 'granted', 'denied', 'prompt', или 'unsupported'
 */
export const checkPermission = async (permission) => {
  if (!isPermissionsAPISupported()) {
    console.log("Permissions API не поддерживается");
    return "unsupported";
  }

  try {
    const result = await navigator.permissions.query({ name: permission });
    return result.state;
  } catch (error) {
    console.error(`Ошибка при проверке разрешения ${permission}:`, error);
    return "unsupported";
  }
};

/**
 * Запрашивает доступ к камере
 * @param {Object} constraints - Ограничения для камеры
 * @returns {Promise<Object>} - { success: boolean, stream?: MediaStream, error?: string }
 */
export const requestCameraAccess = async (constraints = {}) => {
  if (!isGetUserMediaSupported()) {
    return {
      success: false,
      error: "getUserMedia не поддерживается в этом браузере",
    };
  }

  const defaultConstraints = {
    video: {
      facingMode: "environment", // Задняя камера по умолчанию
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  };

  const finalConstraints = { ...defaultConstraints, ...constraints };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
    return {
      success: true,
      stream: stream,
    };
  } catch (error) {
    let errorMessage = "Не удалось получить доступ к камере";

    switch (error.name) {
      case "NotAllowedError":
        errorMessage =
          "Доступ к камере запрещен. Разрешите доступ в настройках браузера.";
        break;
      case "NotFoundError":
        errorMessage = "Камера не найдена на этом устройстве";
        break;
      case "NotReadableError":
        errorMessage = "Камера занята другим приложением";
        break;
      case "OverconstrainedError":
        errorMessage = "Запрошенные параметры камеры не поддерживаются";
        break;
      case "SecurityError":
        errorMessage =
          "Доступ к камере заблокирован по соображениям безопасности. Используйте HTTPS.";
        break;
      case "AbortError":
        errorMessage = "Запрос к камере был прерван";
        break;
      default:
        errorMessage = "Не удалось получить доступ к камере";
        break;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Запрашивает разрешение на уведомления
 * @returns {Promise<string>} - 'granted', 'denied', или 'default'
 */
export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("Уведомления не поддерживаются");
    return "unsupported";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error("Ошибка при запросе разрешения на уведомления:", error);
    return "denied";
  }
};

/**
 * Запрашивает постоянное хранилище
 * @returns {Promise<boolean>} - true если разрешено, false если нет
 */
export const requestPersistentStorage = async () => {
  if (!("storage" in navigator) || !("persist" in navigator.storage)) {
    console.log("Persistent Storage не поддерживается");
    return false;
  }

  try {
    const persistent = await navigator.storage.persist();
    console.log(
      `Постоянное хранилище: ${persistent ? "разрешено" : "отклонено"}`
    );
    return persistent;
  } catch (error) {
    console.error("Ошибка при запросе постоянного хранилища:", error);
    return false;
  }
};

/**
 * Получает информацию о квоте хранилища
 * @returns {Promise<Object>} - { quota: number, usage: number, usageDetails?: Object }
 */
export const getStorageEstimate = async () => {
  if (!("storage" in navigator) || !("estimate" in navigator.storage)) {
    console.log("Storage API не поддерживается");
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      quota: estimate.quota,
      usage: estimate.usage,
      usageDetails: estimate.usageDetails,
    };
  } catch (error) {
    console.error("Ошибка при получении информации о хранилище:", error);
    return null;
  }
};

/**
 * Проверяет, работает ли приложение по HTTPS
 * @returns {boolean}
 */
export const isHTTPS = () => {
  return (
    window.location.protocol === "https:" ||
    window.location.hostname === "localhost"
  );
};

/**
 * Проверяет все разрешения, необходимые для PWA
 * @returns {Promise<Object>} - Объект с результатами проверки всех разрешений
 */
export const checkAllPermissions = async () => {
  const results = {
    https: isHTTPS(),
    permissionsAPI: isPermissionsAPISupported(),
    getUserMedia: isGetUserMediaSupported(),
    camera: "unknown",
    notifications: Notification.permission,
    persistentStorage: false,
    storageEstimate: null,
  };

  // Проверяем разрешение камеры
  if (isPermissionsAPISupported()) {
    try {
      results.camera = await checkPermission("camera");
    } catch (error) {
      results.camera = "unsupported";
    }
  }

  // Проверяем постоянное хранилище
  if ("storage" in navigator && "persisted" in navigator.storage) {
    try {
      results.persistentStorage = await navigator.storage.persisted();
    } catch (error) {
      results.persistentStorage = false;
    }
  }

  // Получаем информацию о хранилище
  results.storageEstimate = await getStorageEstimate();

  return results;
};

/**
 * Отображает пользователю информацию о разрешениях
 * @param {Object} permissions - Результат checkAllPermissions()
 */
export const displayPermissionsInfo = (permissions) => {
  console.group("🔐 Статус разрешений PWA");

  console.log(`📡 HTTPS: ${permissions.https ? "✅" : "❌"}`);
  console.log(
    `🔧 Permissions API: ${permissions.permissionsAPI ? "✅" : "❌"}`
  );
  console.log(`📷 getUserMedia: ${permissions.getUserMedia ? "✅" : "❌"}`);
  console.log(
    `📸 Камера: ${getPermissionEmoji(permissions.camera)} ${permissions.camera}`
  );
  console.log(
    `🔔 Уведомления: ${getPermissionEmoji(permissions.notifications)} ${
      permissions.notifications
    }`
  );
  console.log(
    `💾 Постоянное хранилище: ${permissions.persistentStorage ? "✅" : "❌"}`
  );

  if (permissions.storageEstimate) {
    const usedMB = Math.round(permissions.storageEstimate.usage / 1024 / 1024);
    const totalMB = Math.round(permissions.storageEstimate.quota / 1024 / 1024);
    console.log(`📊 Хранилище: ${usedMB}MB / ${totalMB}MB`);
  }

  console.groupEnd();
};

/**
 * Возвращает эмодзи для статуса разрешения
 * @param {string} permission - Статус разрешения
 * @returns {string} - Эмодзи
 */
const getPermissionEmoji = (permission) => {
  switch (permission) {
    case "granted":
      return "✅";
    case "denied":
      return "❌";
    case "prompt":
      return "❓";
    case "unsupported":
      return "🚫";
    default:
      return "❓";
  }
};
