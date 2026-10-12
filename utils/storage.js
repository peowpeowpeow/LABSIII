const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'donations.json');
const SEED_FILE = path.join(__dirname, '..', 'data', 'seed.json');

// Массив записей в памяти (источник данных для маршрутов)
const donations = [];
let lastCreatedMs = 0;

// Загрузка данных из файла при старте (если файла нет или он повреждён — из seed.json)
function init() {
  let list;
  try {
    if (!fs.existsSync(DATA_FILE)) fs.copyFileSync(SEED_FILE, DATA_FILE);
    list = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (!Array.isArray(list)) throw new Error('Файл данных должен содержать массив');
  } catch (err) {
    const backup = DATA_FILE + '.broken-' + Date.now();
    console.error(`Файл данных повреждён (${err.message}). Копия: ${backup}. Загружены начальные данные.`);
    if (fs.existsSync(DATA_FILE)) fs.renameSync(DATA_FILE, backup);
    fs.copyFileSync(SEED_FILE, DATA_FILE);
    list = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  }

  donations.splice(0, donations.length, ...list);
  lastCreatedMs = Math.max(0, ...donations.map((d) => Date.parse(d.createdAt) || 0));
  console.log(`Загружено записей: ${donations.length} (файл ${path.relative(process.cwd(), DATA_FILE)})`);
}

// Атомарная запись массива в файл (через временный файл)
async function save() {
  const tmp = DATA_FILE + '.tmp';
  await fs.promises.writeFile(tmp, JSON.stringify(donations, null, 2), 'utf8');
  await fs.promises.rename(tmp, DATA_FILE);
}

// Уникальное время создания (с миллисекундами, строго возрастает)
function uniqueCreatedAt() {
  let now = Date.now();
  if (now <= lastCreatedMs) now = lastCreatedMs + 1;
  lastCreatedMs = now;
  return new Date(now).toISOString();
}

// Добавление записи: при ошибке записи в файл изменения откатываются
async function add(data) {
  const id = donations.reduce((max, d) => Math.max(max, d.id), 0) + 1;
  const donation = { id, ...data, status: 'planned', createdAt: uniqueCreatedAt() };
  donations.push(donation);
  try {
    await save();
  } catch (err) {
    donations.pop();
    throw err;
  }
  return donation;
}

function findById(id) {
  return donations.find((d) => d.id === id);
}

module.exports = { donations, init, add, findById };
