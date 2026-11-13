// Ошибка приложения с понятным пользователю сообщением и HTTP-статусом
class AppError extends Error {
  constructor(status, userMessage, hint, cause) {
    super(userMessage);
    this.name = 'AppError';
    this.status = status;
    this.userMessage = userMessage;
    this.hint = hint || null;
    this.code = cause && cause.code ? cause.code : null;
    this.cause = cause;
  }
}

// Перевод системных ошибок файловой системы в понятные сообщения
const FS_REASONS = {
  ENOENT: 'путь к файлу не найден',
  EACCES: 'нет прав доступа (файл или папка защищены)',
  EPERM: 'операция запрещена (файл доступен только для чтения или заблокирован)',
  EBUSY: 'файл занят другой программой',
  EISDIR: 'по этому пути находится папка, а не файл',
  ENOTDIR: 'на месте папки находится файл',
  EEXIST: 'на месте папки находится файл',
  ENOSPC: 'на диске закончилось свободное место',
  EROFS: 'диск доступен только для чтения',
  EMFILE: 'открыто слишком много файлов'
};

function fromFsError(err, what, filePath, hint) {
  const reason = FS_REASONS[err && err.code] || 'непредвиденный сбой при работе с файлом';
  const message = `Не удалось обратиться к файлу ${what} (${filePath}): ${reason}.`;
  return new AppError(500, message, hint, err);
}

module.exports = { AppError, fromFsError };
