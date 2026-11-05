require('dotenv').config({ path: './blood_donation.env' });
require('dotenv').config();
const { sequelize, Donor } = require('./models');
const MongoDonor = require('./mongo/models/Donor');
const mongoose = require('mongoose');
const dns = require('node:dns');

dns.setServers(['1.1.1.1', '8.8.8.8']);

(async () => {
    try {
        await sequelize.authenticate();
        console.log('PostgreSQL подключен');

        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB подключен');

        const sqlDonors = await Donor.findAll();
        let count = 0;

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
                count++;
            }
        }

        console.log(`Синхронизировано из PostgreSQL в MongoDB: ${count} новых доноров`);
    } catch (err) {
        console.error('Ошибка синхронизации:', err);
    } finally {
        await sequelize.close();
        await mongoose.disconnect();
    }
})();