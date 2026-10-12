const express = require('express');
const fs = require('fs/promises');

const router = express.Router();

// Демонстрация ошибки 500: синхронное исключение в обработчике
router.get('/error-500', () => {
  throw new Error('Демонстрационная ошибка: исключение в синхронном обработчике маршрута');
});

// Демонстрация ошибки 500: отклонённый промис (Express 5 сам передаёт её в next)
router.get('/error-500-async', async () => {
  await fs.readFile('data/file-that-does-not-exist.json', 'utf8');
});

module.exports = router;
