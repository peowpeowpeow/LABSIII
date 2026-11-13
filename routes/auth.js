const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Пароль должен быть не менее 8 символов' });
        }

        if (!/[A-Z]/.test(password)) {
            return res.status(400).json({ error: 'Пароль должен содержать заглавную букву' });
        }

        if (!/[0-9]/.test(password)) {
            return res.status(400).json({ error: 'Пароль должен содержать цифру' });
        }

        const existing = await User.findOne({ where: { email } });
        if (existing) {
            return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        
        const finalName = name || email.split('@')[0];

        const user = await User.create({ 
            email, 
            passwordHash, 
            role: 'user',
            name: finalName
        });

        res.status(201).json({ id: user.id, email: user.email, role: user.role, name: user.name });
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
        }
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'email', 'role', 'name']
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