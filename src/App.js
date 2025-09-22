import React, { useState, useEffect, useCallback } from "react";
import PhotoUploader from "./components/PhotoUploader";
import PhotoGrid from "./components/PhotoGrid";
import NetworkStatus from "./components/NetworkStatus";
import { photoService } from "./services/PhotoService";
import {
  checkAllPermissions,
  displayPermissionsInfo,
  isHTTPS,
} from "./utils/permissions";

function App() {
  const [photos, setPhotos] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncInfo, setSyncInfo] = useState(null);
  const [localDataStats, setLocalDataStats] = useState({ count: 0, sizeKB: 0 });
  const [isUploading, setIsUploading] = useState(false);

  // Проверка статуса сети
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const calculateLocalDataStats = useCallback(async () => {
    try {
      const stats = await photoService.getLocalDataStats();
      setLocalDataStats(stats);
    } catch (error) {
      console.error("Ошибка расчета статистики:", error);
      setLocalDataStats({ count: 0, sizeKB: 0 });
    }
  }, []);

  const loadPhotos = useCallback(
    async (withSync = false) => {
      try {
        setIsLoading(true);
        if (withSync) setIsSyncing(true);

        let savedPhotos;

        if (withSync) {
          // Загружаем с синхронизацией с сервером
          savedPhotos = await photoService.getAllPhotosWithSync();
          console.log("Фотографии загружены с синхронизацией с сервером");
        } else {
          // Обычная загрузка из локальной базы
          savedPhotos = await photoService.getAllPhotos();
        }

        setPhotos(savedPhotos);
        console.log(`Загружено ${savedPhotos.length} фотографий`);

        // Обновляем статистику локальных данных
        await calculateLocalDataStats();
        await photoService.syncWithServer();
      } catch (error) {
        console.error("Ошибка загрузки фотографий:", error);
      } finally {
        setIsLoading(false);
        setIsSyncing(false);
      }
    },
    [calculateLocalDataStats]
  );

  const retryPendingUploads = useCallback(async () => {
    try {
      // Получаем актуальные фотографии из базы данных вместо state
      const allPhotos = await photoService.getAllPhotos();
      const pendingPhotos = allPhotos.filter(
        (photo) => photo.status === "pending"
      );

      let uploadedCount = 0;
      for (const photo of pendingPhotos) {
        try {
          await photoService.uploadPhoto(photo);
          uploadedCount++;
        } catch (uploadError) {
          console.error(`Ошибка загрузки фото ${photo.name}:`, uploadError);
        }
      }

      // Если были успешно загружены фото, выполняем синхронизацию
      if (uploadedCount > 0) {
        console.log(
          `✅ Успешно загружено ${uploadedCount} фото, начинаем синхронизацию...`
        );
        await photoService.syncWithServer();
        console.log("🔄 Синхронизация завершена");
      }

      // Перезагружаем список фотографий
      await loadPhotos();
    } catch (error) {
      console.error("Ошибка повторной отправки:", error);
    }
  }, [loadPhotos]);

  // Загрузка фотографий при инициализации
  useEffect(() => {
    // При первом запуске загружаем с синхронизацией с сервером
    loadPhotos(true);
    console.log("initi");

    // Проверяем разрешения при запуске приложения
    const checkPermissions = async () => {
      try {
        const permissions = await checkAllPermissions();
        displayPermissionsInfo(permissions);

        // Предупреждаем если не HTTPS (кроме localhost)
        if (!isHTTPS() && window.location.hostname !== "localhost") {
          console.warn(
            "⚠️ Приложение работает по HTTP. Для полной функциональности камеры необходим HTTPS."
          );
        }
      } catch (error) {
        console.error("Ошибка при проверке разрешений:", error);
      }
    };

    checkPermissions();
  }, [loadPhotos]);

  // Попытка отправить отложенные фотографии при восстановлении сети
  useEffect(() => {
    if (isOnline) {
      retryPendingUploads();
    }
  }, [isOnline, retryPendingUploads]);

  const handlePhotoUpload = async (file) => {
    try {
      const photoData = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // Более уникальный ID
        file: file,
        name: file.name,
        size: file.size,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      // Сохраняем в IndexedDB
      await photoService.savePhoto(photoData);

      // Обновляем состояние
      setPhotos((prev) => [...prev, photoData]);

      // Пытаемся отправить, если есть интернет
      if (isOnline) {
        try {
          setIsUploading(true);
          setSyncInfo("Загрузка фото на сервер...");

          await photoService.uploadPhoto(photoData);
          console.log(
            "✅ Фото успешно загружено на сервер, начинаем синхронизацию..."
          );

          setSyncInfo("Синхронизация и очистка локальных данных...");

          // Автоматическая синхронизация после успешной загрузки
          await photoService.syncWithServer();
          console.log("🔄 Синхронизация завершена");

          setSyncInfo("Обновление интерфейса...");

          // Перезагружаем фото для обновления интерфейса
          await loadPhotos(true);

          setSyncInfo("✅ Фото загружено и синхронизировано!");
          setTimeout(() => setSyncInfo(null), 2000);
        } catch (uploadError) {
          console.error("Ошибка загрузки на сервер:", uploadError);
          setSyncInfo("❌ Ошибка загрузки");
          setTimeout(() => setSyncInfo(null), 3000);
          // Не блокируем интерфейс, просто логируем ошибку
          await loadPhotos(); // Обновляем статус с ошибкой
        } finally {
          setIsUploading(false);
        }
      }
    } catch (error) {
      console.error("Ошибка загрузки фотографии:", error);
    }
  };

  const handleRetryUpload = async (photoId) => {
    try {
      const photo = photos.find((p) => p.id === photoId);
      if (photo) {
        await photoService.uploadPhoto(photo);
        console.log("✅ Фото успешно загружено, начинаем синхронизацию...");

        // Автоматическая синхронизация после успешной загрузки
        await photoService.syncWithServer();
        console.log("🔄 Синхронизация завершена");

        await loadPhotos();
      }
    } catch (error) {
      console.error("Ошибка повторной отправки:", error);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    try {
      await photoService.deletePhoto(photoId);
      // Обновляем состояние, удаляя фотографию из списка
      setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
    } catch (error) {
      console.error("Ошибка удаления фотографии:", error);
      alert("Не удалось удалить фотографию. Попробуйте еще раз.");
    }
  };

  if (isLoading) {
    return (
      <div className="container">
        <div className="loading">
          {isSyncing
            ? "🔄 Синхронизация с сервером..."
            : isUploading
            ? "📤 Загрузка фото на сервер..."
            : "Загрузка фотографий..."}
        </div>
      </div>
    );
  }

  const handleSyncWithServer = async () => {
    try {
      setSyncInfo("Подключение к серверу...");
      await loadPhotos(true);

      // Показываем информацию о результате синхронизации
      const serverPhotos = photos.filter((photo) => photo.isFromServer);
      const localPhotos = photos.filter((photo) => !photo.isFromServer);

      setSyncInfo(
        `Синхронизировано: ${serverPhotos.length} с сервера + ${localPhotos.length} локальных`
      );

      // Скрываем информацию через 3 секунды
      setTimeout(() => setSyncInfo(null), 3000);
    } catch (error) {
      console.error("Ошибка синхронизации:", error);
      setSyncInfo("Ошибка синхронизации");
      setTimeout(() => setSyncInfo(null), 3000);
    }
  };

  const handleCleanupDuplicates = async () => {
    try {
      setSyncInfo("Очистка дубликатов...");
      setIsSyncing(true);

      const cleanedCount = await photoService.cleanupDuplicatePhotos();

      if (cleanedCount > 0) {
        setSyncInfo(`Удалено дубликатов: ${cleanedCount}`);
        // Перезагружаем фото после очистки
        await loadPhotos();
      } else {
        setSyncInfo("Дубликаты не найдены");
      }

      setTimeout(() => setSyncInfo(null), 3000);
    } catch (error) {
      console.error("Ошибка очистки дубликатов:", error);
      setSyncInfo("Ошибка очистки");
      setTimeout(() => setSyncInfo(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCleanupLocalData = async () => {
    try {
      setSyncInfo("Очистка локальных данных...");
      setIsSyncing(true);

      const result = await photoService.cleanupAllUploadedLocalData();

      if (result.cleanedCount > 0) {
        setSyncInfo(
          `Очищено ${result.cleanedCount} фото (${result.totalSizeKB} KB)`
        );
        // Перезагружаем фото после очистки
        await loadPhotos();
      } else {
        setSyncInfo("Нет данных для очистки");
      }

      setTimeout(() => setSyncInfo(null), 4000);
    } catch (error) {
      console.error("Ошибка очистки локальных данных:", error);
      setSyncInfo("Ошибка очистки");
      setTimeout(() => setSyncInfo(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>📸 Photo Upload PWA</h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <NetworkStatus isOnline={isOnline} />
          {isOnline && (
            <>
              <button
                onClick={handleSyncWithServer}
                disabled={isSyncing}
                style={{
                  background: isSyncing ? "#6c757d" : "#007bff",
                  color: "white",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  cursor: isSyncing ? "not-allowed" : "pointer",
                }}
              >
                {isSyncing ? "🔄 Синхронизация..." : "🔄 Синхронизация"}
              </button>
              <button
                onClick={handleCleanupLocalData}
                disabled={isSyncing}
                title="Очистить локальные данные уже загруженных фотографий"
                style={{
                  background: isSyncing ? "#6c757d" : "#28a745",
                  color: "white",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  cursor: isSyncing ? "not-allowed" : "pointer",
                }}
              >
                🧹 Очистить локальные
              </button>
              <button
                onClick={handleCleanupDuplicates}
                disabled={isSyncing}
                title="Удалить дубликаты фотографий"
                style={{
                  background: isSyncing ? "#6c757d" : "#dc3545",
                  color: "white",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  cursor: isSyncing ? "not-allowed" : "pointer",
                }}
              >
                🗑️ Дубликаты
              </button>
            </>
          )}
          <div
            style={{
              fontSize: "12px",
              color: "#666",
              background: "#f8f9fa",
              padding: "4px 8px",
              borderRadius: "4px",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            <div>
              📊 Всего: {photos.length} | 🌐 Сервер:{" "}
              {photos.filter((p) => p.isFromServer).length} | 📱 Локальные:{" "}
              {photos.filter((p) => !p.isFromServer).length}
            </div>
            {localDataStats.count > 0 && (
              <div style={{ fontSize: "11px", color: "#888" }}>
                💾 Локальных данных: {localDataStats.count} фото (
                {localDataStats.sizeKB} KB)
              </div>
            )}
          </div>
        </div>
      </header>

      {syncInfo && (
        <div
          style={{
            background: "#e3f2fd",
            border: "1px solid #2196f3",
            borderRadius: "6px",
            padding: "12px",
            margin: "10px 0",
            fontSize: "14px",
            color: "#1976d2",
            textAlign: "center",
          }}
        >
          ℹ️ {syncInfo}
        </div>
      )}

      <PhotoUploader onPhotoUpload={handlePhotoUpload} />

      <PhotoGrid
        photos={photos}
        onRetryUpload={handleRetryUpload}
        onDeletePhoto={handleDeletePhoto}
        isOnline={isOnline}
      />
    </div>
  );
}

export default App;
