import React, { useMemo, useCallback, useEffect, memo, useRef } from "react";

const PhotoGrid = ({ photos, onRetryUpload, onDeletePhoto, isOnline }) => {
  const urlCacheRef = useRef(new Map());

  // Создаем URL для фотографий и кэшируем их
  const photosWithUrls = useMemo(() => {
    const urlCache = urlCacheRef.current;

    return photos.map((photo) => {
      // Если уже есть серверный URL, используем его
      if (photo.url && photo.status === "uploaded") {
        return photo;
      }

      // Для локальных файлов создаем blob URL
      if (photo.file && !photo.url) {
        // Создаем URL только если его нет в кэше
        if (!urlCache.has(photo.id)) {
          urlCache.set(photo.id, URL.createObjectURL(photo.file));
        }
        return {
          ...photo,
          url: urlCache.get(photo.id),
        };
      }

      return photo;
    });
  }, [photos]);

  // Очищаем неиспользуемые URL
  useEffect(() => {
    const urlCache = urlCacheRef.current;
    const currentPhotoIds = new Set(photos.map((p) => p.id));

    // Удаляем URL для фото, которых больше нет
    for (const [photoId, url] of urlCache.entries()) {
      if (!currentPhotoIds.has(photoId)) {
        URL.revokeObjectURL(url);
        urlCache.delete(photoId);
      }
    }

    // Cleanup при размонтировании
    return () => {
      for (const [, url] of urlCache.entries()) {
        URL.revokeObjectURL(url);
      }
      urlCache.clear();
    };
  }, [photos]);

  const handleRetryUpload = useCallback(
    (photoId) => {
      onRetryUpload(photoId);
    },
    [onRetryUpload]
  );

  const handleDeletePhoto = useCallback(
    (photoId) => {
      if (window.confirm("Вы уверены, что хотите удалить эту фотографию?")) {
        onDeletePhoto(photoId);
      }
    },
    [onDeletePhoto]
  );

  // Мемоизируем функции для предотвращения перерендеров
  const getStatusText = useCallback((status) => {
    switch (status) {
      case "pending":
        return "Ожидает отправки";
      case "uploading":
        return "Загружается...";
      case "uploaded":
        return "Отправлено";
      case "error":
        return "Ошибка отправки";
      default:
        return "Неизвестно";
    }
  }, []);

  const getStatusClass = useCallback((status) => {
    switch (status) {
      case "pending":
        return "status-pending";
      case "uploading":
        return "status-uploading";
      case "uploaded":
        return "status-uploaded";
      case "error":
        return "status-error";
      default:
        return "status-pending";
    }
  }, []);

  const formatFileSize = useCallback((bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }, []);

  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("ru-RU");
  }, []);

  if (photos.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
        <p>📷 Пока нет загруженных фотографий</p>
        <p>Добавьте первую фотографию, перетащив файл в область выше</p>
      </div>
    );
  }

  return (
    <div className="photo-grid">
      {photosWithUrls.map((photo) => (
        <PhotoItem
          key={photo.id}
          photo={photo}
          onRetryUpload={handleRetryUpload}
          onDeletePhoto={handleDeletePhoto}
          isOnline={isOnline}
          getStatusText={getStatusText}
          getStatusClass={getStatusClass}
          formatFileSize={formatFileSize}
          formatDate={formatDate}
        />
      ))}
    </div>
  );
};

// Мемоизированный компонент для отдельной фотографии
const PhotoItem = memo(
  ({
    photo,
    onRetryUpload,
    onDeletePhoto,
    isOnline,
    getStatusText,
    getStatusClass,
    formatFileSize,
    formatDate,
  }) => {
    const handleRetryClick = useCallback(() => {
      onRetryUpload(photo.id);
    }, [onRetryUpload, photo.id]);

    const handleDeleteClick = useCallback(() => {
      onDeletePhoto(photo.id);
    }, [onDeletePhoto, photo.id]);

    const handleImageError = useCallback((e) => {
      console.error(`Ошибка загрузки изображения: ${e.target.src}`);
      e.target.src =
        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==";
    }, []);

    return (
      <div className="photo-item">
        <img
          src={photo.url}
          alt={photo.name}
          onError={handleImageError}
          loading="lazy"
        />
        <div className="photo-info">
          <div className="photo-name" title={photo.name}>
            {photo.name}
          </div>
          <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>
            {formatFileSize(photo.size)} • {formatDate(photo.createdAt)}
          </div>
          <div className={`photo-status ${getStatusClass(photo.status)}`}>
            {getStatusText(photo.status)}
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            {photo.status === "error" && isOnline && (
              <button
                className="retry-button"
                onClick={handleRetryClick}
                title="Повторить отправку"
              >
                🔄 Повторить
              </button>
            )}
            <button
              className="delete-button"
              onClick={handleDeleteClick}
              title="Удалить фотографию"
              style={{
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "6px 12px",
                fontSize: "12px",
                cursor: "pointer",
                flex: "1",
              }}
            >
              🗑️ Удалить
            </button>
          </div>
          {photo.status === "pending" && !isOnline && (
            <div
              style={{ fontSize: "12px", color: "#856404", marginTop: "5px" }}
            >
              ⏳ Ожидает интернета
            </div>
          )}
          {photo.status === "uploading" && (
            <div
              style={{ fontSize: "12px", color: "#007bff", marginTop: "5px" }}
            >
              📤 Загружается...
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default PhotoGrid;
