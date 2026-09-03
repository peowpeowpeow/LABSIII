const express = require('express');
const app = express();

app.use(express.json());

const PORT = 3000;

let donors = [];
let nextId = 1;

app.get('/donors', (req, res) => {
    res.json(donors);
});

app.get('/donors/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const donor = donors.find(d => d.id === id);
    
    if (!donor) {
        return res.status(404).json({ error: 'Элемент не найден' });
    }
    
    res.json(donor);
});

app.post('/donors', (req, res) => {
    const { fullName, bloodType, phone } = req.body;
    
    if (!fullName || !bloodType || !phone) {
        return res.status(400).json({ error: 'Неверные данные запроса' });
    }
    
    const newDonor = {
        id: nextId++,
        fullName,
        bloodType,
        phone
    };
    
    donors.push(newDonor);
    res.status(201).json(newDonor);
});

app.put('/donors/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const donor = donors.find(d => d.id === id);
    
    if (!donor) {
        return res.status(404).json({ error: 'Элемент не найден' });
    }
    
    const { fullName, bloodType, phone } = req.body;
    
    if (!fullName || !bloodType || !phone) {
        return res.status(400).json({ error: 'Неверные данные запроса' });
    }
    
    donor.fullName = fullName;
    donor.bloodType = bloodType;
    donor.phone = phone;
    
    res.json(donor);
});

app.delete('/donors/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = donors.findIndex(d => d.id === id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Элемент не найден' });
    }
    
    donors.splice(index, 1);
    res.status(204).send();
});

app.use((req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
    console.log('Server running...');
});