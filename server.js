require('dotenv').config({ path: './blood_donation.env' });
require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const { sequelize, Donor } = require('./models');
const connectMongo = require('./mongo/db');
const { authenticate } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const mongoDonorRoutes = require('./mongo/routes/donors');
const initSocket = require('./socket');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

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

app.post('/donors', authenticate, async (req, res) => {
    try {
        const { fullName, bloodType, phone } = req.body;
        if (!fullName || !bloodType || !phone) {
            return res.status(400).json({ error: 'Неверные данные запроса' });
        }

        const newDonor = await Donor.create(req.body);

        try {
            const MongoDonor = require('./mongo/models/Donor');
            await MongoDonor.create({
                fullName: newDonor.fullName,
                bloodType: newDonor.bloodType,
                phone: newDonor.phone,
                email: newDonor.email || undefined,
                donations: []
            });
            console.log(`Донор ${newDonor.fullName} синхронизирован в MongoDB`);
        } catch (mongoErr) {
            console.error('Ошибка синхронизации с MongoDB:', mongoErr.message);
        }

        res.status(201).json(newDonor);
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'Донор с таким email уже существует' });
        }
        res.status(400).json({ error: err.message });
    }
});

app.put('/donors/:id', authenticate, async (req, res) => {
    try {
        const donor = await Donor.findByPk(req.params.id);
        if (!donor) return res.status(404).json({ error: 'Элемент не найден' });

        await donor.update(req.body);

        try {
            const MongoDonor = require('./mongo/models/Donor');
            await MongoDonor.updateOne(
                { email: donor.email },
                { 
                    fullName: donor.fullName, 
                    bloodType: donor.bloodType, 
                    phone: donor.phone 
                }
            );
            console.log(`Донор ${donor.fullName} обновлен в MongoDB`);
        } catch (mongoErr) {
            console.error('Ошибка обновления в MongoDB:', mongoErr.message);
        }

        res.json(donor);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/donors/:id', authenticate, async (req, res) => {
    try {
        const donor = await Donor.findByPk(req.params.id);
        if (!donor) return res.status(404).json({ error: 'Элемент не найден' });

        const emailToDelete = donor.email;
        await donor.destroy();

        try {
            const MongoDonor = require('./mongo/models/Donor');
            if (emailToDelete) {
                await MongoDonor.deleteOne({ email: emailToDelete });
                console.log(`Донор ${emailToDelete} удален из MongoDB`);
            }
        } catch (mongoErr) {
            console.error('Ошибка удаления из MongoDB:', mongoErr.message);
        }

        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/mongo/sync', authenticate, async (req, res) => {
    try {
        const MongoDonor = require('./mongo/models/Donor');
        const sqlDonors = await Donor.findAll();
        let addedCount = 0;

        for (const d of sqlDonors) {
            const query = d.email ? { email: d.email } : { phone: d.phone };
            const exists = await MongoDonor.findOne(query);
            
            if (!exists) {
                await MongoDonor.create({
                    fullName: d.fullName,
                    bloodType: d.bloodType,
                    phone: d.phone,
                    email: d.email || undefined,
                    donations: []
                });
                addedCount++;
            }
        }

        res.json({ message: `Синхронизация завершена. Добавлено новых доноров: ${addedCount}`, count: addedCount });
    } catch (err) {
        console.error('Ошибка синхронизации:', err);
        res.status(500).json({ error: 'Ошибка при синхронизации баз данных' });
    }
});

app.use((req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

(async () => {
    try {
        await sequelize.authenticate();
        console.log('PostgreSQL подключен');
    } catch (err) {
        console.error('Ошибка PostgreSQL:', err.message);
    }

    await connectMongo();

    const server = http.createServer(app);
    initSocket(server);

    server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
})();