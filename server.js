
require('dotenv').config();
const express = require('express');
const { Donor } = require('./models');

const app = express();
app.use(express.json());

const PORT = 3000;
// GET /donors - получить всех
app.get('/donors', async (req, res) => {
    try {
        const donors = await Donor.findAll();
        res.json(donors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /donors/:id - получить одного
app.get('/donors/:id', async (req, res) => {
    try {
        const donor = await Donor.findByPk(req.params.id);
        if (!donor) {
            return res.status(404).json({ error: 'Элемент не найден' });
        }
        res.json(donor);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /donors - добавить
app.post('/donors', async (req, res) => {
    try {
        const { fullName, bloodType, phone } = req.body;
        if (!fullName ||!bloodType ||!phone) {
            return res.status(400).json({ error: 'Неверные данные запроса' });
        }
        const newDonor = await Donor.create(req.body);
        res.status(201).json(newDonor);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /donors/:id - обновить
app.put('/donors/:id', async (req, res) => {
    try {
        const donor = await Donor.findByPk(req.params.id);
        if (!donor) {
            return res.status(404).json({ error: 'Элемент не найден' });
        }
        await donor.update(req.body);
        res.json(donor);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /donors/:id - удалить
app.delete('/donors/:id', async (req, res) => {
    try {
        const donor = await Donor.findByPk(req.params.id);
        if (!donor) {
            return res.status(404).json({ error: 'Элемент не найден' });
        }
        await donor.destroy();
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Обработка несуществующих маршрутов
app.use((req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
