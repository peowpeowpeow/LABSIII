const storage = require('../utils/storage');
const journal = require('../utils/journal');
const { AppError } = require('../utils/appError');
const { validateDonation } = require('../utils/validation');
const { STATUSES, LIMITS, toISODate, addDays } = require('../utils/helpers');

// Ошибка «не найдено» с HTTP-статусом 404
function notFoundError(message) {
  const err = new Error(message);
  err.status = 404;
  return err;
}

// Начальные значения формы
function emptyForm() {
  return {
    donorName: '', age: '', weight: '', bloodGroup: '', rhFactor: '',
    donationType: 'whole', volume: '450', center: '', donationDate: '',
    donationTime: '', phone: '', email: '', notifyBy: 'sms', comment: '', agree: ''
  };
}

// Параметры для шаблона формы
function formLocals(values, errors) {
  const today = toISODate(new Date());
  return {
    title: 'Запись на донацию',
    values,
    errors,
    fields: LIMITS.fields,
    schedule: LIMITS.schedule,
    minDate: today,
    maxDate: addDays(today, LIMITS.schedule.maxDaysAhead)
  };
}

// GET / — список записей с фильтром по статусу и статистикой
function list(req, res) {
  const status = Object.prototype.hasOwnProperty.call(STATUSES, req.query.status) ? req.query.status : null;
  const all = storage.donations;

  const items = all
    .filter((d) => !status || d.status === status)
    .sort((a, b) => (b.donationDate + b.donationTime).localeCompare(a.donationDate + a.donationTime));

  const stats = {
    total: all.length,
    planned: all.filter((d) => d.status === 'planned').length,
    done: all.filter((d) => d.status === 'done').length,
    volume: all.filter((d) => d.status === 'done').reduce((sum, d) => sum + d.volume, 0)
  };

  const createdId = Number(req.query.created);
  const created = Number.isInteger(createdId) ? storage.findById(createdId) : null;

  res.render('index', { title: 'Записи на донацию', items, stats, status, created });
}

// GET /item/:id — детальная страница записи
function show(req, res, next) {
  if (!/^\d{1,9}$/.test(req.params.id)) return next(notFoundError(`Некорректный номер записи: «${req.params.id.slice(0, 30)}»`));

  const donation = storage.findById(Number(req.params.id));
  if (!donation) return next(notFoundError(`Запись №${req.params.id} не найдена`));

  const history = storage.donations
    .filter((d) => d.phone === donation.phone && d.id !== donation.id)
    .sort((a, b) => b.donationDate.localeCompare(a.donationDate));

  res.render('item', { title: `Запись №${donation.id}`, donation, history });
}

// GET /add — форма добавления
function addForm(req, res) {
  res.render('add', formLocals(emptyForm(), {}));
}

// POST /add — проверка данных, запись в журнал и в файл данных, редирект на главную
function addSubmit(req, res) {
  const body = req.body || {};
  const { errors, data, isValid } = validateDonation(body, storage.donations);

  if (!isValid) {
    const values = { ...emptyForm() };
    for (const key of Object.keys(values)) {
      if (typeof body[key] === 'string') values[key] = body[key].slice(0, 1000);
    }
    return res.status(422).render('add', formLocals(values, errors));
  }

  // Создание записи — критичная операция: без записи в журнал она запрещена
  try {
    journal.write(`[${new Date().toLocaleString('ru-RU')}] Создание записи: ${data.donorName}, ${data.donationDate} ${data.donationTime}`);
  } catch (err) {
    throw new AppError(500, `Запись на донацию не сохранена, так как журнал запросов недоступен. ${err.userMessage}`, err.hint, err.cause);
  }

  const donation = storage.add(data);
  res.redirect(res.locals.link(`/?created=${donation.id}`));
}

// GET /login — страница входа (имитация)
function loginPage(req, res) {
  const returnTo = /^\/[A-Za-z0-9/_-]*$/.test(req.query.returnTo || '') && !req.query.returnTo.startsWith('//')
    ? req.query.returnTo
    : '/';
  res.render('login', { title: 'Вход', returnTo });
}

module.exports = { list, show, addForm, addSubmit, loginPage };
