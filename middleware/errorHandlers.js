// Резервная HTML-страница на случай, если не удалось отрендерить сам шаблон 500.ejs
function fallbackHtml(status, errorId, message) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Ошибка ${status}</title></head>
<body style="font-family:sans-serif;background:#fff;color:#222;padding:40px">
<h1>Ошибка ${status}</h1><p>${message}</p><p>Код ошибки: ${errorId}</p>
<p><a href="/">На главную</a></p></body></html>`;
}

// Понятное сообщение для ошибок, которые создало не само приложение
function describe(err) {
  if (err.userMessage) return { message: err.userMessage, hint: err.hint };
  if (err.type === 'entity.too.large') {
    return { message: 'Отправлено слишком много данных: размер формы превышает допустимый.', hint: 'Сократите текст в полях формы и отправьте её снова.' };
  }
  if (err.type === 'parameters.too.many') {
    return { message: 'Форма содержит слишком много полей.', hint: 'Отправьте форму со страницы сайта без изменений.' };
  }
  return { message: 'При обработке запроса произошла внутренняя ошибка сервера.', hint: 'Повторите запрос позже. Если ошибка повторяется, сообщите администратору код ошибки.' };
}

// 404: ни один маршрут не обработал запрос
function notFound(req, res) {
  res.status(404).render('404', {
    title: 'Страница не найдена',
    requestedUrl: req.originalUrl,
    message: null
  });
}

// Централизованный обработчик ошибок (4 параметра): 404 из контроллеров и все ошибки 4xx/5xx
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  // Значения для шапки, если ошибка возникла раньше middleware авторизации
  if (!res.locals.user) res.locals.user = { name: 'Гость', isAuthenticated: false };
  if (!res.locals.link) res.locals.link = (url) => url;
  if (!res.locals.currentPath) res.locals.currentPath = req.path;

  const status = Number(err.status || err.statusCode) || 500;

  // Запись не найдена: ошибка 404 из контроллера
  if (status === 404) {
    return res.status(404).render('404', {
      title: 'Страница не найдена',
      requestedUrl: req.originalUrl,
      message: err.message
    });
  }

  // Код ошибки и понятное сообщение в консоль
  const httpStatus = status >= 400 && status < 600 ? status : 500;
  const errorId = 'ERR-' + Date.now().toString(36).toUpperCase();
  const occurredAt = new Date();
  const { message, hint } = describe(err);
  console.error(`[${occurredAt.toLocaleString('ru-RU')}] ${errorId} ${req.method} ${req.originalUrl}: ${message}`);
  if (!err.userMessage && httpStatus >= 500) console.error(err.stack || err);

  res.status(httpStatus).render('500', {
    title: httpStatus >= 500 ? 'Ошибка сервера' : 'Ошибка запроса',
    status: httpStatus,
    errorId,
    occurredAt,
    method: req.method,
    requestedUrl: req.originalUrl,
    message,
    hint
  }, (renderErr, html) => {
    if (renderErr) {
      console.error(`${errorId}: не удалось отобразить страницу ошибки, отправлена резервная страница`);
      return res.type('html').send(fallbackHtml(httpStatus, errorId, message));
    }
    res.send(html);
  });
}

module.exports = { notFound, errorHandler };
