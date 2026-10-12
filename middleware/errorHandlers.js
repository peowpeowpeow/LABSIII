// Резервная HTML-страница на случай, если не удалось отрендерить сам шаблон 500.ejs
function fallbackHtml(status, errorId) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Ошибка ${status}</title></head>
<body style="font-family:sans-serif;background:#fff;color:#222;padding:40px">
<h1>Ошибка ${status}</h1><p>Внутренняя ошибка сервера. Код ошибки: ${errorId}</p>
<p><a href="/">На главную</a></p></body></html>`;
}

// 404: ни один маршрут не обработал запрос
function notFound(req, res) {
  res.status(404).render('404', {
    title: 'Страница не найдена',
    requestedUrl: req.originalUrl,
    message: null
  });
}

// Централизованный обработчик ошибок (4 параметра): 404 из маршрутов и все 500
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = Number(err.status || err.statusCode) || 500;

  // Ошибка «не найдено», брошенная контроллером (например, нет записи с таким ID)
  if (status === 404) {
    return res.status(404).render('404', {
      title: 'Страница не найдена',
      requestedUrl: req.originalUrl,
      message: err.message
    });
  }

  // Логирование ошибки с уникальным кодом для поиска в консоли
  const errorId = 'ERR-' + Date.now().toString(36).toUpperCase();
  const occurredAt = new Date();
  console.error(`[${occurredAt.toLocaleString('ru-RU')}] ${errorId} ${req.method} ${req.originalUrl}`);
  console.error(err.stack || err);

  const httpStatus = status >= 400 && status < 600 ? status : 500;
  const isDev = process.env.NODE_ENV !== 'production';

  res.status(httpStatus).render('500', {
    title: 'Ошибка сервера',
    status: httpStatus,
    errorId,
    occurredAt,
    method: req.method,
    requestedUrl: req.originalUrl,
    errorName: err.name || 'Error',
    errorMessage: err.expose || isDev ? err.message : 'Внутренняя ошибка сервера',
    stack: isDev ? err.stack : null
  }, (renderErr, html) => {
    if (renderErr) {
      console.error('Не удалось отрендерить 500.ejs:', renderErr);
      return res.type('html').send(fallbackHtml(httpStatus, errorId));
    }
    res.send(html);
  });
}

module.exports = { notFound, errorHandler };
