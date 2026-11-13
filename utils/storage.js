const fs = require('fs');
const path = require('path');
const { AppError, fromFsError } = require('./appError');

const DATA_FILE = path.join(__dirname, '..', 'data', 'donations.json');
const SEED_FILE = path.join(__dirname, '..', 'data', 'seed.json');
const DATA_NAME = 'data/donations.json';
const HINT = 'Проверьте, что файл data/donations.json доступен для чтения и записи и не открыт в другой программе.';

// Массив записей в памяти (источник данных для маршрутов)
const donations = [];
let lastCreatedMs = 0;

// Создание файла данных из начального набора, если файла нет
function ensureFile() {
  if (fs.existsSync(DATA_FILE)) return false;
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.copyFileSync(SEED_FILE, DATA_FILE);
  } catch (err) {
    throw fromFsError(err, 'данных', DATA_NAME, HINT);
  }
  console.log(`[Данные] Файл ${DATA_NAME} не найден и создан заново из data/seed.json`);
  return true;
}

// Чтение файла в массив перед каждым запросом: при сбое — понятная ошибка 500
function load() {
  ensureFile();

  let text;
  try {
    text = fs.readFileSync(DATA_FILE, 'utf8');
  } catch (err) {
    throw fromFsError(err, 'данных', DATA_NAME, HINT);
  }

  let list;
  try {
    list = JSON.parse(text);
  } catch (err) {
    throw new AppError(500, `Файл данных ${DATA_NAME} повреждён: его содержимое не является корректным JSON.`,
      'Восстановите файл из резервной копии или удалите его — при следующем запросе он будет создан заново.', err);
  }
  if (!Array.isArray(list)) {
    throw new AppError(500, `Файл данных ${DATA_NAME} повреждён: вместо списка записей в нём находится другой объект.`,
      'Восстановите файл из резервной копии или удалите его — при следующем запросе он будет создан заново.');
  }

  donations.splice(0, donations.length, ...list);
  lastCreatedMs = Math.max(lastCreatedMs, ...donations.map((d) => Date.parse(d.createdAt) || 0));
}

// Атомарная запись массива в файл через временный файл
function save() {
  const tmp = DATA_FILE + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify(donations, null, 2), 'utf8');
    fs.renameSync(tmp, DATA_FILE);
  } catch (err) {
    try { fs.rmSync(tmp, { force: true }); } catch (e) { /* временный файл мог не создаться */ }
    throw fromFsError(err, 'данных', DATA_NAME, HINT);
  }
}

// Уникальное время создания с миллисекундами (строго возрастает)
function uniqueCreatedAt() {
  let now = Date.now();
  if (now <= lastCreatedMs) now = lastCreatedMs + 1;
  lastCreatedMs = now;
  return new Date(now).toISOString();
}

// Добавление записи: при ошибке записи в файл изменения откатываются
function add(data) {
  const id = donations.reduce((max, d) => Math.max(max, d.id), 0) + 1;
  const donation = { id, ...data, status: 'planned', createdAt: uniqueCreatedAt() };
  donations.push(donation);
  try {
    save();
  } catch (err) {
    donations.pop();
    throw err;
  }
  return donation;
}

function findById(id) {
  return donations.find((d) => d.id === id);
}

module.exports = { donations, load, add, findById, DATA_NAME };
