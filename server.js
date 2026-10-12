const path = require('path');
const express = require('express');

const logger = require('./middleware/logger');
const { auth } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errorHandlers');
const storage = require('./utils/storage');
const helpers = require('./utils/helpers');
const donationRoutes = require('./routes/donations');
const demoRoutes = require('./routes/demo');

const app = express();
const PORT = process.env.PORT || 3000;

// Настройка шаблонизатора EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');

// Функции-помощники и справочники, доступные во всех шаблонах
Object.assign(app.locals, helpers);

// Глобальные middleware: логирование, статика, разбор тела формы, авторизация
app.use(logger);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(auth);

// Маршруты приложения
app.use('/', donationRoutes);
app.use('/', demoRoutes);

// Обработка ошибок: подключается строго ПОСЛЕ всех маршрутов
app.use(notFound);
app.use(errorHandler);

// Загрузка данных из файла и запуск сервера
storage.init();
app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
  console.log(`С авторизацией:  http://localhost:${PORT}/?auth=1`);
});
