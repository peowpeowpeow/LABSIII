const express = require('express');
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/donationController');

const router = express.Router();

// Маршруты записей на донацию (/add защищён middleware requireAuth)
router.get('/', controller.list);
router.get('/item/:id', controller.show);
router.get('/add', requireAuth, controller.addForm);
router.post('/add', requireAuth, controller.addSubmit);
router.get('/login', controller.loginPage);

module.exports = router;
