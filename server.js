const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const port = 3001;

// Создаем папку для загрузки файлов, если её нет
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Настройка CORS
app.use(cors());
app.use(express.json());

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // Генерируем уникальное имя файла
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB максимум
  },
  fileFilter: (req, file, cb) => {
    // Проверяем, что это изображение
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Файл должен быть изображением"), false);
    }
  },
});

// Маршрут для загрузки фотографий
app.post("/api/upload", upload.single("photo"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Файл не был загружен" });
    }

    // Симулируем небольшую задержку
    setTimeout(() => {
      const result = {
        success: true,
        file: {
          id: req.body.id || Date.now().toString(),
          filename: req.file.filename,
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          url: `/uploads/${req.file.filename}`,
          uploadedAt: new Date().toISOString(),
        },
        message: "Файл успешно загружен",
      };

      res.json(result);
    }, 1000 + Math.random() * 2000); // 1-3 секунды задержки
  } catch (error) {
    console.error("Ошибка загрузки файла:", error);
    res.status(500).json({ error: "Ошибка сервера при загрузке файла" });
  }
});

// Статические файлы для просмотра загруженных изображений
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Маршрут для получения списка загруженных файлов
app.get("/api/files", (req, res) => {
  try {
    const files = fs
      .readdirSync(uploadDir)
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext);
      })
      .map((filename) => {
        const filepath = path.join(uploadDir, filename);
        const stats = fs.statSync(filepath);
        return {
          filename,
          url: `/uploads/${filename}`,
          size: stats.size,
          uploadedAt: stats.birthtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json({ files });
  } catch (error) {
    console.error("Ошибка получения списка файлов:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Маршрут для удаления файла
app.delete("/api/files/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(uploadDir, filename);

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      res.json({ success: true, message: "Файл удален" });
    } else {
      res.status(404).json({ error: "Файл не найден" });
    }
  } catch (error) {
    console.error("Ошибка удаления файла:", error);
    res.status(500).json({ error: "Ошибка сервера при удалении файла" });
  }
});

// Обработчик ошибок multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "Файл слишком большой (максимум 10MB)" });
    }
  }

  if (error.message === "Файл должен быть изображением") {
    return res.status(400).json({ error: error.message });
  }

  console.error("Неожиданная ошибка:", error);
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
});

app.listen(port, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${port}`);
  console.log(`📁 Файлы сохраняются в: ${uploadDir}`);
  console.log(`🌐 API доступен на: http://localhost:${port}/api/upload`);
});
