const express = require('express');
const { requireAuth } = require('../middleware/auth');
const storage = require('../utils/storage');
const controller = require('../controllers/donationController');

const router = express.Router();

// Чтение файла данных перед обработчиком (при сбое Express передаёт ошибку в errorHandler)
function loadData(req, res, next) {
  storage.load();
  next();
}

// Маршруты записей на донацию (/add защищён middleware requireAuth)
router.get('/', loadData, controller.list);
router.get('/item/:id', loadData, controller.show);
router.get('/add', requireAuth, controller.addForm);
router.post('/add', requireAuth, loadData, controller.addSubmit);
router.get('/login', controller.loginPage);

module.exports = router;
