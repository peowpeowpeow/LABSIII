const storage = require('../utils/storage');
const { validateDonation, LIMITS } = require('../utils/validation');
const { STATUSES, toISODate, addDays } = require('../utils/helpers');

// Создание ошибки с HTTP-статусом
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
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
    limits: LIMITS,
    minDate: today,
    maxDate: addDays(today, LIMITS.maxDaysAhead)
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
  if (!/^\d+$/.test(req.params.id)) return next(httpError(404, `Некорректный идентификатор записи: «${req.params.id}»`));

  const donation = storage.findById(Number(req.params.id));
  if (!donation) return next(httpError(404, `Запись №${req.params.id} не найдена`));

  const history = storage.donations
    .filter((d) => d.phone === donation.phone && d.id !== donation.id)
    .sort((a, b) => b.donationDate.localeCompare(a.donationDate));

  res.render('item', { title: `Запись №${donation.id}`, donation, history });
}

// GET /add — форма добавления
function addForm(req, res) {
  res.render('add', formLocals(emptyForm(), {}));
}

// POST /add — проверка данных, сохранение в файл, редирект на главную
async function addSubmit(req, res) {
  const body = req.body || {};
  const { errors, data, isValid } = validateDonation(body, storage.donations);

  if (!isValid) {
    const values = { ...emptyForm() };
    for (const key of Object.keys(values)) {
      if (typeof body[key] === 'string') values[key] = body[key];
    }
    return res.status(422).render('add', formLocals(values, errors));
  }

  const donation = await storage.add(data);
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
