// Конфигурация для разных окружений
const config = {
  development: {
    API_URL: "http://localhost:3001",
    WS_URL: "ws://localhost:3000",
    ENV: "development",
  },
  production: {
    API_URL: "http://109.205.212.29",
    WS_URL: "ws://109.205.212.29",
    ENV: "production",
  },
};

// Определяем текущее окружение
const getCurrentEnv = () => {
  // Проверяем переменные окружения React
  if (process.env.REACT_APP_ENV) {
    return process.env.REACT_APP_ENV;
  }

  // Проверяем NODE_ENV
  if (process.env.NODE_ENV === "production") {
    return "production";
  }

  // Проверяем hostname для автоматического определения
  if (typeof window !== "undefined") {
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return "development";
    }
    return "production";
  }

  return "development";
};

const currentEnv = getCurrentEnv();
const currentConfig = config[currentEnv];

export default currentConfig;
export { config, getCurrentEnv };
