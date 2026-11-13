const limits = require('../config/limits.json');
const { BLOOD_GROUPS, RH_FACTORS, DONATION_TYPES, CENTERS, NOTIFY_METHODS, toISODate, addDays } = require('./helpers');

const F = limits.fields;
const S = limits.schedule;

// Регулярные выражения для проверки формата
const RE = {
  name: /^[A-Za-zА-Яа-яЁё]+(?:-[A-Za-zА-Яа-яЁё]+)*(?: [A-Za-zА-Яа-яЁё]+(?:-[A-Za-zА-Яа-яЁё]+)*)+$/,
  integer: /^\d+$/,
  decimal: /^\d+(?:[.,]\d)?$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  time: /^([01]\d|2[0-3]):(00|30)$/,
  phone: /^\+375(25|29|33|44)\d{7}$/,
  email: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/
};

// Очистка строки: управляющие символы заменяются пробелом, пробелы схлопываются, края обрезаются
function clean(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Очистка многострочного текста (комментарий) с сохранением переносов строк
function cleanMultiline(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n').map((l) => l.trim()).join('\n')
    .trim();
}

// Обязательное текстовое поле: тип, пустота, только пробелы, длина
function requiredText(raw, label, { min = 1, max }) {
  if (raw === undefined || raw === null) return { error: `Поле «${label}» обязательно для заполнения` };
  if (typeof raw !== 'string') return { error: `Поле «${label}» содержит некорректное значение` };
  if (raw.length === 0) return { error: `Поле «${label}» обязательно для заполнения` };
  const value = clean(raw);
  if (value.length === 0) return { error: `Поле «${label}» не может состоять только из пробелов` };
  if (value.length < min) return { error: `«${label}»: минимум ${min} символов (сейчас ${value.length})` };
  if (max && value.length > max) return { error: `«${label}»: максимум ${max} символов (сейчас ${value.length})` };
  return { value };
}

// Числовое поле: непустое, ограничение длины, значение не меньше нуля, формат, диапазон
function numberField(raw, label, { min, max, maxLength, decimal = false, unit = '' }) {
  const base = requiredText(raw, label, { max: 1000 });
  if (base.error) return base;
  const str = base.value.replace(/\s/g, '');

  if (str.length > maxLength) return { error: `«${label}»: слишком длинное значение, не более ${maxLength} символов` };
  if (str.startsWith('-')) return { error: `«${label}» не может быть отрицательным (значение должно быть ≥ 0)` };
  if (!(decimal ? RE.decimal : RE.integer).test(str)) {
    return { error: decimal
      ? `«${label}»: введите число (допускается один знак после запятой) без букв и пробелов`
      : `«${label}»: введите целое число без букв, знаков и пробелов` };
  }

  const num = Number(str.replace(',', '.'));
  if (!Number.isFinite(num) || num < 0) return { error: `«${label}» должно быть числом ≥ 0` };
  if (num < min || num > max) return { error: `«${label}»: допустимо от ${min} до ${max}${unit}` };
  return { value: num };
}

// Значение из списка (select или radio): защита от подмены значений
function enumField(raw, label, dictionary) {
  if (raw !== undefined && typeof raw !== 'string') return { error: `Поле «${label}» содержит некорректное значение` };
  if (raw === undefined || clean(raw) === '') return { error: `Выберите значение в поле «${label}»` };
  const value = clean(raw);
  if (!Object.prototype.hasOwnProperty.call(dictionary, value)) {
    return { error: `Поле «${label}» содержит недопустимое значение` };
  }
  return { value };
}

// Проверка формы записи на донацию
function validateDonation(body, existing) {
  const errors = {};
  const data = {};
  const put = (field, result) => {
    if (result.error) errors[field] = result.error;
    else data[field] = result.value;
  };

  // ФИО: только буквы, пробел между словами, дефис внутри слова, минимум два слова
  const name = requiredText(body.donorName, 'ФИО донора', F.donorName);
  if (!name.error && !RE.name.test(name.value)) {
    name.error = '«ФИО донора»: минимум два слова (фамилия и имя), только буквы, пробел и дефис внутри слова';
  }
  put('donorName', name);

  // Возраст и вес: числа не меньше нуля и ограничения для доноров
  put('age', numberField(body.age, 'Возраст', { ...F.age, unit: ' лет' }));
  put('weight', numberField(body.weight, 'Вес', { ...F.weight, decimal: true, unit: ' кг' }));

  // Значения списков сверяются со справочниками
  put('bloodGroup', enumField(body.bloodGroup, 'Группа крови', BLOOD_GROUPS));
  put('rhFactor', enumField(body.rhFactor, 'Резус-фактор', RH_FACTORS));
  put('donationType', enumField(body.donationType, 'Вид донации', DONATION_TYPES));
  put('center', enumField(body.center, 'Центр сдачи крови', CENTERS));
  put('notifyBy', enumField(body.notifyBy, 'Уведомление', NOTIFY_METHODS));

  // Объём: целое число не меньше нуля, диапазон зависит от вида донации
  const type = DONATION_TYPES[data.donationType];
  put('volume', numberField(body.volume, 'Объём', {
    min: type ? type.minVolume : 0,
    max: type ? type.maxVolume : 650,
    maxLength: F.volume.maxLength,
    unit: ' мл'
  }));

  // Дата визита: реальная дата, не в прошлом и не дальше допустимого числа дней
  const today = toISODate(new Date());
  const lastDay = addDays(today, S.maxDaysAhead);
  const date = requiredText(body.donationDate, 'Дата визита', { max: F.date.maxLength });
  if (!date.error) {
    const [y, m, d] = date.value.split('-').map(Number);
    const real = new Date(y, m - 1, d);
    if (!RE.date.test(date.value) || real.getFullYear() !== y || real.getMonth() !== m - 1 || real.getDate() !== d) {
      date.error = '«Дата визита»: некорректная дата';
    } else if (date.value < today) {
      date.error = '«Дата визита» не может быть в прошлом';
    } else if (date.value > lastDay) {
      date.error = `«Дата визита»: запись открыта не более чем на ${S.maxDaysAhead} дней вперёд`;
    }
  }
  put('donationDate', date);

  // Время визита: шаг 30 минут, рабочие часы, для сегодняшней даты — позже текущего времени
  const time = requiredText(body.donationTime, 'Время визита', { max: F.time.maxLength });
  if (!time.error) {
    if (!RE.time.test(time.value)) {
      time.error = '«Время визита»: формат ЧЧ:ММ, минуты 00 или 30';
    } else if (time.value < S.workStart || time.value > S.workEnd) {
      time.error = `«Время визита»: приём с ${S.workStart} до ${S.workEnd}`;
    } else if (data.donationDate === today) {
      const now = new Date();
      const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (time.value <= nowStr) time.error = '«Время визита»: на сегодня это время уже прошло';
    }
  }
  put('donationTime', time);

  // Телефон: белорусский номер, хранится в едином формате
  const phone = requiredText(body.phone, 'Телефон', F.phone);
  if (!phone.error) {
    const digits = phone.value.replace(/[\s()-]/g, '');
    if (!RE.phone.test(digits)) {
      phone.error = '«Телефон»: формат +375 (XX) XXX-XX-XX, код оператора 25, 29, 33 или 44';
    } else {
      phone.value = `+375 (${digits.slice(4, 6)}) ${digits.slice(6, 9)}-${digits.slice(9, 11)}-${digits.slice(11)}`;
    }
  }
  put('phone', phone);

  // E-mail: необязателен, но обязателен при уведомлении по e-mail
  const emailRaw = clean(body.email);
  if (typeof body.email === 'string' && body.email.length > 0 && emailRaw === '') {
    errors.email = '«E-mail» не может состоять только из пробелов';
  } else if (emailRaw === '') {
    if (data.notifyBy === 'email') errors.email = 'Для уведомления по e-mail укажите адрес электронной почты';
    else data.email = '';
  } else if (emailRaw.length > F.email.max) {
    errors.email = `«E-mail»: максимум ${F.email.max} символов (сейчас ${emailRaw.length})`;
  } else if (!RE.email.test(emailRaw)) {
    errors.email = '«E-mail»: некорректный адрес (пример: donor@mail.by)';
  } else {
    data.email = emailRaw.toLowerCase();
  }

  // Комментарий: необязателен, строка из пробелов считается пустой, длина ограничена
  const comment = cleanMultiline(body.comment);
  if (comment.length > F.comment.max) {
    errors.comment = `«Комментарий»: максимум ${F.comment.max} символов (сейчас ${comment.length})`;
  } else {
    data.comment = comment;
  }

  // Подтверждение отсутствия противопоказаний
  if (body.agree !== 'on') errors.agree = 'Необходимо подтвердить отсутствие противопоказаний';

  // Один донор (телефон) — одна запланированная донация на дату
  if (!errors.phone && !errors.donationDate) {
    const duplicate = existing.find((d) =>
      d.status === 'planned' && d.phone === data.phone && d.donationDate === data.donationDate);
    if (duplicate) {
      errors.donationDate = `Донор с этим телефоном уже записан на ${data.donationDate.split('-').reverse().join('.')} (запись №${duplicate.id})`;
    }
  }

  return { errors, data, isValid: Object.keys(errors).length === 0 };
}

module.exports = { validateDonation };
