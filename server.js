require('dotenv').config({ path: './blood_donation.env' });
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Donor } = require('./models');
const { authenticate } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const connectMongo = require('./mongo/db');
const mongoDonorRoutes = require('./mongo/routes/donors');

const app = express();

app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const PORT = 3000;

app.use('/auth', authRoutes);

app.use('/profile', profileRoutes);

app.use('/mongo/donors', mongoDonorRoutes);

app.get('/donors', async (req, res) => {
    try {
        const donors = await Donor.findAll({ order: [['id', 'ASC']] });
        res.json(donors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/donors/:id', async (req, res) => {
    try {
        const donor = await Donor.findByPk(req.params.id);
        if (!donor) return res.status(404).json({ error: 'Элемент не найден' });
        res.json(donor);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/donors', authenticate, async (req, res) => {
    try {
        const { fullName, bloodType, phone } = req.body;
        if (!fullName || !bloodType || !phone) {
            return res.status(400).json({ error: 'Неверные данные запроса' });
        }
        const newDonor = await Donor.create(req.body);
        res.status(201).json(newDonor);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/donors/:id', authenticate, async (req, res) => {
    try {
        const donor = await Donor.findByPk(req.params.id);
        if (!donor) return res.status(404).json({ error: 'Элемент не найден' });
        await donor.update(req.body);
        res.json(donor);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/donors/:id', authenticate, async (req, res) => {
    try {
        const donor = await Donor.findByPk(req.params.id);
        if (!donor) return res.status(404).json({ error: 'Элемент не найден' });
        await donor.destroy();
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.use((req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

connectMongo();

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});