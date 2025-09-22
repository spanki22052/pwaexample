import React, { useCallback, useState, useRef } from "react";

const PhotoUploader = ({ onPhotoUpload }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const handleFileSelect = useCallback(
    async (files) => {
      if (!files || files.length === 0) return;

      setIsUploading(true);
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          // Проверяем, что это изображение
          if (!file.type.startsWith("image/")) {
            alert(`Файл ${file.name} не является изображением`);
            continue;
          }

          // Проверяем размер файла (максимум 10MB)
          if (file.size > 10 * 1024 * 1024) {
            alert(`Файл ${file.name} слишком большой (максимум 10MB)`);
            continue;
          }

          await onPhotoUpload(file);
        }
      } catch (error) {
        console.error("Ошибка обработки файлов:", error);
        alert("Произошла ошибка при загрузке файлов");
      } finally {
        setIsUploading(false);
      }
    },
    [onPhotoUpload]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      handleFileSelect(files);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e) => {
      const files = Array.from(e.target.files);
      handleFileSelect(files);
      // Сбрасываем input для возможности повторного выбора того же файла
      e.target.value = "";
    },
    [handleFileSelect]
  );

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Используем заднюю камеру
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Ошибка доступа к камере:", error);
      alert("Не удалось получить доступ к камере. Проверьте разрешения.");
      setIsCapturing(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Устанавливаем размеры canvas как у видео
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Рисуем кадр из видео на canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Конвертируем canvas в Blob
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], `photo_${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
            resolve(file);
          } else {
            resolve(null);
          }
        },
        "image/jpeg",
        0.8
      );
    });
  }, []);

  const handleCapture = useCallback(async () => {
    try {
      const file = await capturePhoto();
      if (file) {
        await handleFileSelect([file]);
        stopCamera();
      }
    } catch (error) {
      console.error("Ошибка съемки фото:", error);
      alert("Ошибка при съемке фото");
    }
  }, [capturePhoto, handleFileSelect, stopCamera]);

  return (
    <div>
      {!isCapturing ? (
        <div
          className={`upload-area ${isDragOver ? "dragover" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInputChange}
            className="upload-input"
          />

          <div>
            <p>📷 Перетащите фотографии сюда или</p>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                className="upload-button"
                onClick={handleButtonClick}
                disabled={isUploading}
              >
                {isUploading ? "Загрузка..." : "Выберите файлы"}
              </button>
              <button
                className="upload-button"
                onClick={startCamera}
                disabled={isUploading}
                style={{ backgroundColor: "#28a745" }}
              >
                📸 Сделать фото
              </button>
            </div>
          </div>

          <p style={{ marginTop: "10px", fontSize: "14px", color: "#666" }}>
            Поддерживаются форматы: JPG, PNG, GIF, WebP
          </p>
        </div>
      ) : (
        <div
          className="camera-container"
          style={{
            background: "white",
            borderRadius: "10px",
            padding: "20px",
            textAlign: "center",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <h3>📸 Камера</h3>
          <div style={{ position: "relative", marginBottom: "20px" }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                width: "100%",
                maxWidth: "400px",
                height: "auto",
                borderRadius: "10px",
                transform: "scaleX(-1)", // Зеркальное отображение
              }}
            />
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </div>
          <div
            style={{ display: "flex", gap: "10px", justifyContent: "center" }}
          >
            <button
              className="upload-button"
              onClick={handleCapture}
              style={{ backgroundColor: "#dc3545" }}
            >
              📷 Сделать снимок
            </button>
            <button
              className="upload-button"
              onClick={stopCamera}
              style={{ backgroundColor: "#6c757d" }}
            >
              ❌ Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoUploader;
