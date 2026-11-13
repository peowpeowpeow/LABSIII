const path = require('path');
const express = require('express');

const limits = require('./config/limits.json');
const logger = require('./middleware/logger');
const { auth } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errorHandlers');
const helpers = require('./utils/helpers');
const donationRoutes = require('./routes/donations');

const app = express();
const PORT = process.env.PORT || 3000;

// Настройка шаблонизатора EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');

// Справочники и функции-помощники, доступные во всех шаблонах
Object.assign(app.locals, helpers);

// Глобальные middleware: статика, логирование, авторизация, разбор формы с ограничением размера
app.use(express.static(path.join(__dirname, 'public')));
app.use(logger);
app.use(auth);
app.use(express.urlencoded({
  extended: false,
  limit: limits.request.bodyLimit,
  parameterLimit: limits.request.parameterLimit
}));

// Маршруты приложения
app.use('/', donationRoutes);

// Обработка ошибок: подключается строго после всех маршрутов
app.use(notFound);
app.use(errorHandler);

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
  console.log(`С авторизацией:  http://localhost:${PORT}/?auth=1`);
});
