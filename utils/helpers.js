// Справочники предметной области
const BLOOD_GROUPS = { O: 'O (I)', A: 'A (II)', B: 'B (III)', AB: 'AB (IV)' };

const RH_FACTORS = { pos: 'Rh+', neg: 'Rh−' };

const DONATION_TYPES = {
  whole: { label: 'Цельная кровь', minVolume: 200, maxVolume: 450, intervalDays: 60 },
  plasma: { label: 'Плазма', minVolume: 200, maxVolume: 600, intervalDays: 14 },
  platelets: { label: 'Тромбоциты', minVolume: 200, maxVolume: 500, intervalDays: 14 }
};

const CENTERS = {
  center1: 'Центр трансфузиологии №1 (Минск)',
  center2: 'Городская станция переливания крови (Минск)',
  center3: 'Областной центр трансфузиологии (Гомель)',
  center4: 'Областной центр трансфузиологии (Брест)'
};

const STATUSES = { planned: 'Запланирована', done: 'Выполнена', cancelled: 'Отменена' };

const NOTIFY_METHODS = { none: 'Не уведомлять', sms: 'SMS', email: 'E-mail' };

// Форматирование дат
const pad = (n, len = 2) => String(n).padStart(len, '0');

function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDate(isoDate) {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

function addDays(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return toISODate(new Date(y, m - 1, d + days));
}

// Расчёты для уведомлений и истории донаций
function nextAllowedDate(donation) {
  const type = DONATION_TYPES[donation.donationType];
  return type ? addDays(donation.donationDate, type.intervalDays) : null;
}

function reminderText(donation) {
  if (donation.status !== 'planned' || donation.notifyBy === 'none') return null;
  const when = formatDate(addDays(donation.donationDate, -1));
  const target = donation.notifyBy === 'sms' ? donation.phone : donation.email;
  return `${when} в 18:00 — ${NOTIFY_METHODS[donation.notifyBy]} на ${target}`;
}

module.exports = {
  BLOOD_GROUPS, RH_FACTORS, DONATION_TYPES, CENTERS, STATUSES, NOTIFY_METHODS,
  toISODate, formatDate, formatDateTime, addDays, nextAllowedDate, reminderText
};
