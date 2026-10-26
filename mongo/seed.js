require('dotenv').config();
const mongoose = require('mongoose');
const Donor = require('./models/Donor');

const donors = [
    {
        fullName: 'Иванов Иван Иванович',
        bloodType: 'A+',
        phone: '+375291234567',
        email: 'ivanov@mail.com',
        address: { city: 'Минск', street: 'пр. Независимости, 15' },
        contraindications: [],
        donations: [
            { date: new Date('2026-03-12'), volumeMl: 450, center: 'РНПЦ трансфузиологии', status: 'completed' },
            { date: new Date('2026-07-20'), volumeMl: 450, center: 'РНПЦ трансфузиологии', status: 'completed' }
        ]
    },
    {
        fullName: 'Петрова Анна Сергеевна',
        bloodType: 'B-',
        phone: '+375295678901',
        email: 'petrova@mail.com',
        address: { city: 'Гомель', street: 'ул. Советская, 8' },
        contraindications: ['ОРВИ'],
        donations: [
            { date: new Date('2026-05-04'), volumeMl: 400, center: 'Гомельская ОСПК', status: 'completed' },
            { date: new Date('2026-11-10'), volumeMl: 400, center: 'Гомельская ОСПК', status: 'planned' }
        ]
    },
    {
        fullName: 'Сидоров Пётр Николаевич',
        bloodType: 'O-',
        phone: '+375447654321',
        email: 'sidorov@mail.com',
        address: { city: 'Минск', street: 'ул. Притыцкого, 42' },
        contraindications: [],
        donations: []
    }
];

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        await Donor.deleteMany({});
        const created = await Donor.insertMany(donors);
        console.log(`Добавлено доноров: ${created.length}`);
    } catch (err) {
        console.error('Ошибка заполнения:', err.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
})();