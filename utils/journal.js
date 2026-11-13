const fs = require('fs');
const path = require('path');
const { fromFsError } = require('./appError');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'requests.log');
const LOG_NAME = 'logs/requests.log';

// Запись строки в журнал: папка и файл создаются, если их нет; сбой превращается в понятную ошибку
function write(line) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
  } catch (err) {
    throw fromFsError(err, 'журнала запросов', LOG_NAME,
      'Проверьте, что папка logs существует и файл requests.log не защищён от записи и не заменён папкой.');
  }
}

module.exports = { write, LOG_NAME };
