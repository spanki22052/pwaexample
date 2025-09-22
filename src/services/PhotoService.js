import { openDB } from "idb";
import config from "../config.js";

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

      const photos = await this.db.getAll(STORE_NAME);

      // Восстанавливаем File объекты из ArrayBuffer и устанавливаем правильные URL
      return photos.map((photo) => {
        // Если фото загружено на сервер, используем серверный URL
        if (photo.status === "uploaded" && photo.serverFilename) {
          return {
            ...photo,
            url: `${config.API_URL}/uploads/${photo.serverFilename}`,
            // Не создаем File объект для загруженных фото, он не нужен
          };
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
      });
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

      // Получаем информацию о фотографии перед удалением
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
