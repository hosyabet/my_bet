const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
const staticFolderPath = path.join(__dirname, "static");
// Функция для форматирования даты в формат YYYY-MM-DD_HH-mm-ss
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Месяцы начинаются с 0, поэтому добавляем 1
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

// Настраиваем `multer` для сохранения файлов в папку `static` с переименованием
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, staticFolderPath); // Сохраняем в папку static
  },
  filename: (req, file, cb) => {
    // Получаем текущее время
    const now = new Date();
    const formattedDate = formatDate(now);
    // Получаем расширение файла
    const ext = path.extname(file.originalname);
    // Создаем новое имя файла с добавлением даты и времени
    const newFilename = `${path.basename(
      file.originalname,
      ext
    )}_${formattedDate}${ext}`;
    cb(null, newFilename); // Возвращаем новое имя файла
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname) === ".json") {
      cb(null, true); // Разрешаем только JSON файлы
    } else {
      cb(new Error("Только JSON файлы разрешены!"), false);
    }
  },
});

app.use(express.static(staticFolderPath)); // Обслуживание файлов в папке static

const cache = new Map();

const createChangeKey = () => {
  const files = fs.readdirSync(staticFolderPath);

  return files.length;
};

const updateCache = () => {
  console.log("updateCache");
  cache.clear();

  const key = createChangeKey();

  const combinedData = combineStaticFiles();

  cache.set(key, combinedData);
};

app.post("/upload-json", upload.single("jsonfile"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("Ошибка: Файл не загружен.");
  }
  res.send(`Файл ${req.file.originalname} успешно загружен!`);
  cache.set();
});

// Функция для чтения и объединения JSON-файлов
function combineStaticFiles() {
  const files = fs.readdirSync(staticFolderPath);
  // Получаем список файлов в папке
  let combinedArray = []; // Массив для хранения объединённых данных

  files.forEach((file) => {
    const filePath = path.join(staticFolderPath, file);
    const fileContent = fs.readFileSync(filePath, "utf-8"); // Читаем содержимое файла
    const jsonData = JSON.parse(fileContent); // Парсим содержимое как JSON

    if (Array.isArray(jsonData)) {
      // Проверяем, что это массив
      combinedArray = combinedArray.concat(jsonData); // Добавляем данные в общий массив
    }
  });

  return combinedArray;
}

app.get("/matches", async (req, res) => {
  try {
    const q = req.query.q;
    if (q !== "1") {
      return res.json({});
    }
    const key = createChangeKey();

    if (cache.has(key)) {
      return res.json(cache.get(key));
    }

    const combinedData = combineStaticFiles();

    res.json(combinedData);
    updateCache();
  } catch (error) {
    console.error("Ошибка:", error);
    res.status(500).json({ error: "Ошибка при чтении JSON-файлов" });
  }
});

app.get("/top", async (req, res) => {
  try {
    const q = req.query.q;
    if (q !== "1") {
      return res.json([]);
    }

    const filePath = "top5.json";
    const fileContent = fs.readFileSync(filePath, "utf-8"); // Читаем содержимое файла
    const jsonData = JSON.parse(fileContent); // Парсим содержимое как JSON

    res.json(jsonData);
  } catch (error) {
    console.error("Ошибка:", error);
    res.status(500).json({ error: "Ошибка при чтении JSON-файлов" });
  }
});

// Маршрут для отображения формы загрузки файлов
app.get("/upload-form", (req, res) => {
  res.send(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Загрузка JSON файла</title>
            </head>
            <body>
                <h1>Загрузить JSON файл</h1>
                <form action="/upload-json" method="post" enctype="multipart/form-data">
                    <input type="file" name="jsonfile" accept=".json" />
                    <button type="submit">Загрузить</button>
                </form>
            </body>
        </html>
    `);
});

// Настраиваем сервер
app.listen(3000, () => {
  console.log("Сервер запущен на http://localhost:3000");
});
