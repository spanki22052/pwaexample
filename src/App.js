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

  const loadPhotos = useCallback(async () => {
    try {
      setIsLoading(true);
      const savedPhotos = await photoService.getAllPhotos();
      setPhotos(savedPhotos);
    } catch (error) {
      console.error("Ошибка загрузки фотографий:", error);
    } finally {
      setIsLoading(false);
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
    loadPhotos();

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
        <div className="loading">Загрузка фотографий...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1>📸 Photo Upload PWA</h1>
        <NetworkStatus isOnline={isOnline} />
      </header>

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
