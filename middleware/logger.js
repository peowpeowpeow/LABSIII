const journal = require('../utils/journal');

// Логирование запроса в консоль и в файл logs/requests.log: время, метод, URL, затем статус и длительность
function logger(req, res, next) {
  const startedAt = process.hrtime.bigint();
  const time = new Date().toLocaleString('ru-RU');
  const line = `[${time}] --> ${req.method} ${req.originalUrl}`;

  console.log(line);
  res.locals.logWarning = null;

  try {
    journal.write(line);
  } catch (err) {
    // Сбой журнала: понятное сообщение в консоль и на страницу, работа сайта продолжается
    console.error(`[Журнал] ${err.userMessage}`);
    res.locals.logWarning = err.userMessage;
  }

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const done = `[${time}] <-- ${req.method} ${req.originalUrl} ${res.statusCode} (${ms.toFixed(1)} мс)`;
    console.log(done);
    try {
      journal.write(done);
    } catch (err) {
      console.error(`[Журнал] ${err.userMessage}`);
    }
  });

  next();
}

module.exports = logger;
