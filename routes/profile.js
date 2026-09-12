
const express = require('express');
const { User } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();


router.get('/', authenticate, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'email', 'role', 'createdAt']
        });
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
