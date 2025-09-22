import { openDB } from "idb";
import config from "../config";

const DB_NAME = "PhotoPWA";
const DB_VERSION = 1;
const STORE_NAME = "photos";

class PhotoService {
  constructor() {
    this.db = null;
    this.initDB();
  }

  async initDB() {
    try {
      this.db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: "id" });
          }
        },
      });
    } catch (error) {
      console.error("Ошибка инициализации IndexedDB:", error);
    }
  }

  async savePhoto(photoData) {
    try {
      if (!this.db) await this.initDB();

      // Конвертируем File в ArrayBuffer для хранения
      const arrayBuffer = await photoData.file.arrayBuffer();
      const photoToSave = {
        ...photoData,
        fileData: arrayBuffer,
        fileType: photoData.file.type,
        fileName: photoData.file.name,
      };

      // Удаляем оригинальный File объект
      delete photoToSave.file;

      await this.db.put(STORE_NAME, photoToSave);
      return photoToSave;
    } catch (error) {
      console.error("Ошибка сохранения фотографии:", error);
      throw error;
    }
  }

  async getAllPhotos() {
    try {
      if (!this.db) await this.initDB();

      // Получаем локальные фотографии из IndexedDB
      const localPhotos = await this.db.getAll(STORE_NAME);

      // Получаем серверные фотографии (только если онлайн)
      let serverPhotos = [];
      try {
        if (navigator.onLine) {
          serverPhotos = await this.loadPhotosFromServer();
        }
      } catch (error) {
        console.warn("Не удалось загрузить серверные фото:", error);
        serverPhotos = [];
      }

      // Создаем Set ID локальных фотографий для быстрой проверки
      const localPhotoIds = new Set(localPhotos.map((p) => p.id));

      // Объединяем локальные и серверные фотографии
      const allPhotos = [...localPhotos];

      // Добавляем серверные фотографии, которых нет в локальной базе
      for (const serverPhoto of serverPhotos) {
        if (!localPhotoIds.has(serverPhoto.id)) {
          allPhotos.push(serverPhoto);
        }
      }

      // Восстанавливаем File объекты из ArrayBuffer и устанавливаем правильные URL
      return allPhotos
        .map((photo) => {
          // Если фото загружено на сервер, используем серверный URL
          if (photo.status === "uploaded" && photo.serverFilename) {
            return {
              ...photo,
              url: `${config.API_URL}/uploads/${photo.serverFilename}`,
              // Не создаем File объект для загруженных фото, он не нужен
            };
          }

          // Для серверных фото, которых нет в локальной базе
          if (photo.url && photo.url.startsWith(`${config.API_URL}/uploads/`)) {
            return photo;
          }

          // Для локальных фото создаем File объект
          if (photo.fileData) {
            const file = new File([photo.fileData], photo.fileName, {
              type: photo.fileType,
            });
            return {
              ...photo,
              file: file,
            };
          }

          return photo;
        })
        .sort(
          (a, b) =>
            new Date(b.uploadedAt || b.createdAt) -
            new Date(a.uploadedAt || a.createdAt)
        );
    } catch (error) {
      console.error("Ошибка загрузки фотографий:", error);
      return [];
    }
  }

  async updatePhotoStatus(
    photoId,
    status,
    error = null,
    serverFilename = null
  ) {
    try {
      if (!this.db) {
        await this.initDB();
      }

      const photo = await this.db.get(STORE_NAME, photoId);
      if (photo) {
        photo.status = status;
        if (error) {
          photo.error = error;
        }
        if (serverFilename) {
          photo.serverFilename = serverFilename;
        }
        await this.db.put(STORE_NAME, photo);
      }
    } catch (error) {
      console.error("Ошибка обновления статуса фотографии:", error);
    }
  }

  async deletePhoto(photoId) {
    try {
      if (!this.db) {
        await this.initDB();
      }

      // Проверяем, является ли это серверной фотографией
      if (photoId.startsWith("server-")) {
        // Для серверных фотографий удаляем только с сервера
        const serverFilename = photoId.replace("server-", "");
        try {
          const response = await fetch(
            `${config.API_URL}/api/files/${serverFilename}`,
            {
              method: "DELETE",
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          console.log(`Файл ${serverFilename} успешно удален с сервера`);
        } catch (serverError) {
          console.error("Ошибка при удалении файла с сервера:", serverError);
          throw serverError;
        }
        return;
      }

      // Получаем информацию о локальной фотографии перед удалением
      const photo = await this.db.get(STORE_NAME, photoId);

      // Удаляем файл с сервера, если он был загружен
      if (photo && photo.serverFilename) {
        try {
          const response = await fetch(
            `${config.API_URL}/api/files/${photo.serverFilename}`,
            {
              method: "DELETE",
            }
          );

          if (!response.ok) {
            console.warn(
              `Не удалось удалить файл с сервера: ${photo.serverFilename}`
            );
          } else {
            console.log(
              `Файл ${photo.serverFilename} успешно удален с сервера`
            );
          }
        } catch (serverError) {
          console.warn("Ошибка при удалении файла с сервера:", serverError);
          // Продолжаем удаление из локальной БД даже если сервер недоступен
        }
      }

      // Удаляем из локальной базы данных
      await this.db.delete(STORE_NAME, photoId);
    } catch (error) {
      console.error("Ошибка удаления фотографии:", error);
      throw error;
    }
  }

  async uploadPhoto(photoData) {
    try {
      // Обновляем статус на "загрузка"
      await this.updatePhotoStatus(photoData.id, "uploading");

      // Создаем FormData для отправки файла
      const formData = new FormData();
      formData.append("photo", photoData.file);
      formData.append("id", photoData.id);
      formData.append("name", photoData.name);
      formData.append("createdAt", photoData.createdAt);

      // Отправляем на сервер
      // Если сервер не запущен, используем httpbin.org для демонстрации
      let apiUrl = `${config.API_URL}/api/upload`;

      // Проверяем, доступен ли сервер
      try {
        await fetch(`${config.API_URL}/api/files`, { method: "HEAD" });
      } catch {
        // Если сервер недоступен, используем httpbin
        apiUrl = "https://httpbin.org/post";
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // Сохраняем имя файла на сервере для последующего удаления
      const serverFilename = result.file?.filename || null;
      await this.updatePhotoStatus(
        photoData.id,
        "uploaded",
        null,
        serverFilename
      );

      return {
        id: photoData.id,
        url: result.url || `https://example.com/photos/${photoData.id}.jpg`,
        uploadedAt: new Date().toISOString(),
        serverResponse: result,
        serverFilename: serverFilename,
      };
    } catch (error) {
      console.error("Ошибка загрузки фотографии:", error);

      // Обновляем статус на ошибку
      await this.updatePhotoStatus(photoData.id, "error", error.message);

      throw error;
    }
  }

  // Загружает список фотографий с сервера
  async loadPhotosFromServer() {
    try {
      const apiUrl = `${config.API_URL}/api/files`;
      console.log("Загружаем фотографии с сервера:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const serverPhotos = data.files || [];

      console.log(`Найдено ${serverPhotos.length} фотографий на сервере`);

      // Преобразуем серверные фотографии в формат приложения
      const transformedPhotos = serverPhotos.map((serverPhoto) => ({
        id: `server_${serverPhoto.filename}`, // Уникальный ID для серверных фото
        name: serverPhoto.filename,
        size: serverPhoto.size,
        status: "uploaded",
        createdAt: serverPhoto.uploadedAt,
        serverFilename: serverPhoto.filename,
        url: `${config.API_URL}${serverPhoto.url}`,
        isFromServer: true, // Флаг что это фото с сервера
      }));

      return transformedPhotos;
    } catch (error) {
      console.error("Ошибка загрузки фотографий с сервера:", error);

      // Более подробная информация об ошибках
      if (error.message.includes("Failed to fetch")) {
        console.error("🚨 Возможные причины:");
        console.error("1. Сервер недоступен по адресу:", config.API_URL);
        console.error("2. CORS ошибка - проверьте настройки сервера");
        console.error("3. Content Security Policy блокирует запрос");
        console.error("4. Нет интернет соединения");
      }

      return [];
    }
  }

  // Синхронизирует локальные фото с серверными
  async syncWithServer(forceReload = false) {
    try {
      if (!this.db) await this.initDB();

      // Загружаем фотографии с сервера
      const serverPhotos = await this.loadPhotosFromServer();

      // Получаем локальные фотографии
      const localPhotos = await this.db.getAll(STORE_NAME);

      // Создаем Set из имен файлов на сервере для быстрого поиска
      const serverFilenames = new Set(
        serverPhotos.map((photo) => photo.serverFilename)
      );

      // Обновляем статус локальных фото, которые есть на сервере
      for (const localPhoto of localPhotos) {
        if (
          localPhoto.serverFilename &&
          serverFilenames.has(localPhoto.serverFilename)
        ) {
          if (localPhoto.status !== "uploaded") {
            localPhoto.status = "uploaded";
            await this.db.put(STORE_NAME, localPhoto);
          }
        }
      }

      // Добавляем серверные фото, которых нет в локальной базе
      const localServerFilenames = new Set(
        localPhotos
          .filter((photo) => photo.serverFilename)
          .map((photo) => photo.serverFilename)
      );

      for (const serverPhoto of serverPhotos) {
        if (
          !localServerFilenames.has(serverPhoto.serverFilename) ||
          forceReload
        ) {
          // Сохраняем серверное фото в локальную базу
          // При forceReload обновляем даже существующие серверные фото
          await this.db.put(STORE_NAME, serverPhoto);
          if (forceReload) {
            console.log(`🔄 Обновлено серверное фото: ${serverPhoto.name}`);
          }
        }
      }

      console.log("Синхронизация с сервером завершена");
      return true;
    } catch (error) {
      console.error("Ошибка синхронизации с сервером:", error);
      return false;
    }
  }

  // Получает все фотографии с учетом синхронизации с сервером
  async getAllPhotosWithSync() {
    try {
      console.log("🔄 Начинаем синхронизацию с сервером...");

      // Получаем локальные фото до синхронизации
      const localPhotosBeforeSync = await this.getAllPhotos();
      console.log(
        `📱 Локальных фото до синхронизации: ${localPhotosBeforeSync.length}`
      );

      // Синхронизируемся с сервером
      await this.syncWithServer();

      // Получаем все фотографии после синхронизации
      const allPhotosAfterSync = await this.getAllPhotos();
      console.log(
        `📊 Всего фото после синхронизации: ${allPhotosAfterSync.length}`
      );

      const serverPhotos = allPhotosAfterSync.filter(
        (photo) => photo.isFromServer
      );
      const localPhotos = allPhotosAfterSync.filter(
        (photo) => !photo.isFromServer
      );

      console.log(`🌐 Серверных фото: ${serverPhotos.length}`);
      console.log(`📱 Локальных фото: ${localPhotos.length}`);
      console.log("✅ Синхронизация завершена успешно!");

      return allPhotosAfterSync;
    } catch (error) {
      console.error("❌ Ошибка получения фотографий с синхронизацией:", error);
      // Если синхронизация не удалась, возвращаем только локальные фото
      const localPhotos = await this.getAllPhotos();
      console.log(`📱 Возвращаем только локальные фото: ${localPhotos.length}`);
      return localPhotos;
    }
  }

  // Метод для очистки старых фотографий (опционально)
  async cleanupOldPhotos(daysOld = 30) {
    try {
      if (!this.db) {
        await this.initDB();
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const photos = await this.db.getAll(STORE_NAME);
      const photosToDelete = photos.filter((photo) => {
        const photoDate = new Date(photo.createdAt);
        return photoDate < cutoffDate && photo.status === "uploaded";
      });

      for (const photo of photosToDelete) {
        await this.db.delete(STORE_NAME, photo.id);
      }

      return photosToDelete.length;
    } catch (error) {
      console.error("Ошибка очистки старых фотографий:", error);
      return 0;
    }
  }
}

export const photoService = new PhotoService();
export { PhotoService };
