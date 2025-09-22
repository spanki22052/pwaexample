// Скрипт для тестирования подключения к серверу
// Запуск: node test-server-connection.js

const config = {
  development: {
    API_URL: "http://localhost:3001",
  },
  production: {
    API_URL: "http://109.205.212.29:3001",
  },
};

// Определяем окружение
const env = process.argv[2] || "development";
const currentConfig = config[env];

console.log(`🔍 Тестирование подключения к серверу (${env})`);
console.log(`📡 URL: ${currentConfig.API_URL}`);

async function testConnection() {
  try {
    console.log("\n1️⃣ Тестирование базового подключения...");

    const response = await fetch(`${currentConfig.API_URL}/api/files`);

    console.log(`📊 Статус ответа: ${response.status}`);
    console.log(
      `📋 Заголовки ответа:`,
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`📁 Найдено файлов: ${data.files?.length || 0}`);

    if (data.files && data.files.length > 0) {
      console.log("📄 Пример файла:", data.files[0]);
    }

    console.log("\n✅ Подключение к серверу работает!");
  } catch (error) {
    console.error("\n❌ Ошибка подключения:", error.message);

    if (error.message.includes("fetch is not defined")) {
      console.log("💡 Установите node-fetch: npm install node-fetch");
    } else if (error.message.includes("ECONNREFUSED")) {
      console.log("💡 Сервер не запущен. Запустите: node server.js");
    } else if (error.message.includes("getaddrinfo ENOTFOUND")) {
      console.log("💡 Неверный адрес сервера или нет интернета");
    }
  }
}

// Проверяем доступность fetch
if (typeof fetch === "undefined") {
  console.log("📦 Загружаем node-fetch...");
  import("node-fetch")
    .then(({ default: fetch }) => {
      global.fetch = fetch;
      testConnection();
    })
    .catch(() => {
      console.log(
        "❌ node-fetch не установлен. Установите: npm install node-fetch"
      );
    });
} else {
  testConnection();
}
