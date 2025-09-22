import React, { useState, useEffect } from "react";
import {
  checkAllPermissions,
  requestCameraAccess,
  requestNotificationPermission,
  requestPersistentStorage,
} from "../utils/permissions";

const PermissionsStatus = ({ onClose }) => {
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const perms = await checkAllPermissions();
      setPermissions(perms);
    } catch (error) {
      console.error("Ошибка при загрузке разрешений:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCamera = async () => {
    try {
      const result = await requestCameraAccess();
      if (result.success) {
        // Останавливаем поток, так как это только тест
        result.stream.getTracks().forEach((track) => track.stop());
        alert("✅ Доступ к камере получен!");
      } else {
        alert(`❌ Ошибка: ${result.error}`);
      }
      // Перезагружаем статус разрешений
      loadPermissions();
    } catch (error) {
      console.error("Ошибка при запросе камеры:", error);
      alert("❌ Произошла ошибка при запросе доступа к камере");
    }
  };

  const handleRequestNotifications = async () => {
    try {
      const result = await requestNotificationPermission();
      if (result === "granted") {
        alert("✅ Разрешение на уведомления получено!");
      } else if (result === "denied") {
        alert("❌ Разрешение на уведомления отклонено");
      } else {
        alert("⚠️ Уведомления не поддерживаются");
      }
      loadPermissions();
    } catch (error) {
      console.error("Ошибка при запросе уведомлений:", error);
    }
  };

  const handleRequestStorage = async () => {
    try {
      const result = await requestPersistentStorage();
      if (result) {
        alert("✅ Постоянное хранилище разрешено!");
      } else {
        alert("❌ Постоянное хранилище отклонено или не поддерживается");
      }
      loadPermissions();
    } catch (error) {
      console.error("Ошибка при запросе хранилища:", error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "granted":
      case true:
        return "#28a745";
      case "denied":
      case false:
        return "#dc3545";
      case "prompt":
        return "#ffc107";
      case "unsupported":
        return "#6c757d";
      default:
        return "#6c757d";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "granted":
        return "Разрешено";
      case "denied":
        return "Запрещено";
      case "prompt":
        return "Требует разрешения";
      case "unsupported":
        return "Не поддерживается";
      case true:
        return "Активно";
      case false:
        return "Неактивно";
      default:
        return "Неизвестно";
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="permissions-overlay">
        <div className="permissions-modal">
          <div className="loading">🔄 Загрузка статуса разрешений...</div>
        </div>
      </div>
    );
  }

  if (!permissions) {
    return (
      <div className="permissions-overlay">
        <div className="permissions-modal">
          <div className="error">
            ❌ Не удалось загрузить информацию о разрешениях
          </div>
          <button onClick={onClose} className="close-btn">
            Закрыть
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="permissions-overlay">
      <div className="permissions-modal">
        <div className="permissions-header">
          <h3>🔐 Разрешения и возможности</h3>
          <button onClick={onClose} className="close-btn">
            ❌
          </button>
        </div>

        <div className="permissions-content">
          {/* Безопасность */}
          <div className="permission-section">
            <h4>🔒 Безопасность</h4>
            <div className="permission-item">
              <span>HTTPS подключение</span>
              <span
                className="status"
                style={{ color: getStatusColor(permissions.https) }}
              >
                {permissions.https ? "✅ Активно" : "❌ HTTP"}
              </span>
            </div>
          </div>

          {/* API поддержка */}
          <div className="permission-section">
            <h4>🛠️ Поддержка API</h4>
            <div className="permission-item">
              <span>Permissions API</span>
              <span
                className="status"
                style={{ color: getStatusColor(permissions.permissionsAPI) }}
              >
                {getStatusText(permissions.permissionsAPI)}
              </span>
            </div>
            <div className="permission-item">
              <span>getUserMedia API</span>
              <span
                className="status"
                style={{ color: getStatusColor(permissions.getUserMedia) }}
              >
                {getStatusText(permissions.getUserMedia)}
              </span>
            </div>
          </div>

          {/* Разрешения */}
          <div className="permission-section">
            <h4>📱 Разрешения</h4>

            <div className="permission-item">
              <span>📷 Камера</span>
              <div className="permission-controls">
                <span
                  className="status"
                  style={{ color: getStatusColor(permissions.camera) }}
                >
                  {getStatusText(permissions.camera)}
                </span>
                {permissions.camera === "prompt" && (
                  <button onClick={handleRequestCamera} className="request-btn">
                    Запросить
                  </button>
                )}
              </div>
            </div>

            <div className="permission-item">
              <span>🔔 Уведомления</span>
              <div className="permission-controls">
                <span
                  className="status"
                  style={{ color: getStatusColor(permissions.notifications) }}
                >
                  {getStatusText(permissions.notifications)}
                </span>
                {permissions.notifications === "default" && (
                  <button
                    onClick={handleRequestNotifications}
                    className="request-btn"
                  >
                    Запросить
                  </button>
                )}
              </div>
            </div>

            <div className="permission-item">
              <span>💾 Постоянное хранилище</span>
              <div className="permission-controls">
                <span
                  className="status"
                  style={{
                    color: getStatusColor(permissions.persistentStorage),
                  }}
                >
                  {getStatusText(permissions.persistentStorage)}
                </span>
                {!permissions.persistentStorage && (
                  <button
                    onClick={handleRequestStorage}
                    className="request-btn"
                  >
                    Запросить
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Информация о хранилище */}
          {permissions.storageEstimate && (
            <div className="permission-section">
              <h4>📊 Хранилище</h4>
              <div className="storage-info">
                <div className="storage-item">
                  <span>Использовано:</span>
                  <span>{formatBytes(permissions.storageEstimate.usage)}</span>
                </div>
                <div className="storage-item">
                  <span>Доступно:</span>
                  <span>{formatBytes(permissions.storageEstimate.quota)}</span>
                </div>
                <div className="storage-bar">
                  <div
                    className="storage-used"
                    style={{
                      width: `${
                        (permissions.storageEstimate.usage /
                          permissions.storageEstimate.quota) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="permissions-footer">
          <button onClick={loadPermissions} className="refresh-btn">
            🔄 Обновить
          </button>
          <button onClick={onClose} className="close-btn">
            Закрыть
          </button>
        </div>
      </div>

      <style jsx>{`
        .permissions-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .permissions-modal {
          background: white;
          border-radius: 12px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .permissions-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #eee;
        }

        .permissions-header h3 {
          margin: 0;
          color: #333;
        }

        .permissions-content {
          padding: 20px;
        }

        .permission-section {
          margin-bottom: 25px;
        }

        .permission-section h4 {
          margin: 0 0 15px 0;
          color: #555;
          font-size: 16px;
        }

        .permission-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #f5f5f5;
        }

        .permission-item:last-child {
          border-bottom: none;
        }

        .permission-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .status {
          font-weight: 500;
          font-size: 14px;
        }

        .request-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .request-btn:hover {
          background: #0056b3;
        }

        .storage-info {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
        }

        .storage-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .storage-bar {
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
          margin-top: 10px;
        }

        .storage-used {
          height: 100%;
          background: #007bff;
          transition: width 0.3s;
        }

        .permissions-footer {
          display: flex;
          justify-content: space-between;
          padding: 20px;
          border-top: 1px solid #eee;
        }

        .refresh-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .refresh-btn:hover {
          background: #218838;
        }

        .close-btn {
          background: #6c757d;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .close-btn:hover {
          background: #545b62;
        }

        .loading,
        .error {
          text-align: center;
          padding: 40px;
          font-size: 16px;
        }

        @media (max-width: 768px) {
          .permissions-modal {
            margin: 10px;
            max-height: calc(100vh - 40px);
          }

          .permission-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .permission-controls {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
};

export default PermissionsStatus;
