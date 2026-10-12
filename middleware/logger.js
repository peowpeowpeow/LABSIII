// Логирование запроса: время, метод, URL, а после ответа — статус и длительность
function logger(req, res, next) {
  const startedAt = process.hrtime.bigint();
  const time = new Date().toLocaleString('ru-RU');

  console.log(`[${time}] --> ${req.method} ${req.originalUrl}`);

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
    console.log(`[${time}] <-- ${req.method} ${req.originalUrl} ${res.statusCode} (${ms.toFixed(1)} мс)`);
  });

  next();
}

module.exports = logger;
