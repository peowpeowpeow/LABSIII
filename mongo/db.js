const dns = require('node:dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');

async function connectMongo() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error('MongoDB: переменная MONGO_URI не задана в файле .env');
        return;
    }

    try {
        await mongoose.connect(uri);
        console.log(`MongoDB connected: база "${mongoose.connection.name}"`);
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
    }
}

module.exports = connectMongo;