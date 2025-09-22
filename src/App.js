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

  const loadPhotos = useCallback(async (withSync = false) => {
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
    } catch (error) {
      console.error("Ошибка загрузки фотографий:", error);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  const retryPendingUploads = useCallback(async () => {
    try {
      // Получаем актуальные фотографии из базы данных вместо state
      const allPhotos = await photoService.getAllPhotos();
      const pendingPhotos = allPhotos.filter(
        (photo) => photo.status === "pending"
      );

      for (const photo of pendingPhotos) {
        await photoService.uploadPhoto(photo);
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
          await photoService.uploadPhoto(photoData);
          await loadPhotos(); // Обновляем статус
        } catch (uploadError) {
          console.error("Ошибка загрузки на сервер:", uploadError);
          // Не блокируем интерфейс, просто логируем ошибку
          await loadPhotos(); // Обновляем статус с ошибкой
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

  return (
    <div className="container">
      <header className="header">
        <h1>📸 Photo Upload PWA</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <NetworkStatus isOnline={isOnline} />
          {isOnline && (
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
              {isSyncing ? "🔄 Синхронизация..." : "🔄 секс пон"}
            </button>
          )}
          <div
            style={{
              fontSize: "12px",
              color: "#666",
              background: "#f8f9fa",
              padding: "4px 8px",
              borderRadius: "4px",
            }}
          >
            📊 Всего: {photos.length} | 🌐 Сервер:{" "}
            {photos.filter((p) => p.isFromServer).length} | 📱 Локальные:{" "}
            {photos.filter((p) => !p.isFromServer).length}
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
