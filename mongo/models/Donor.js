const mongoose = require('mongoose');

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const donationSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    volumeMl: {
        type: Number,
        required: [true, 'Укажите объём крови'],
        min: [200, 'Объём не меньше 200 мл'],
        max: [650, 'Объём не больше 650 мл']
    },
    center: { type: String, required: [true, 'Укажите центр переливания крови'], trim: true },
    status: {
        type: String,
        enum: { values: ['planned', 'completed', 'cancelled'], message: 'Неизвестный статус: {VALUE}' },
        default: 'planned'
    }
}, { id: false });

const addressSchema = new mongoose.Schema({
    city: { type: String, trim: true },
    street: { type: String, trim: true }
}, { _id: false });

const donorSchema = new mongoose.Schema({
    fullName: { type: String, required: [true, 'ФИО обязательно'], trim: true },
    bloodType: {
        type: String,
        required: [true, 'Группа крови обязательна'],
        enum: { values: BLOOD_TYPES, message: 'Неизвестная группа крови: {VALUE}' }
    },
    phone: { type: String, required: [true, 'Телефон обязателен'], trim: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    address: addressSchema,
    contraindications: [String],
    donations: [donationSchema]
}, {
    timestamps: true,
    versionKey: false,
    id: false,
    toJSON: { virtuals: true }
});

donorSchema.index({ 'address.city': 1 });

donorSchema.virtual('totalVolumeMl').get(function () {
    return (this.donations || [])
        .filter((d) => d.status === 'completed')
        .reduce((sum, d) => sum + d.volumeMl, 0);
});

const Donor = mongoose.model('Donor', donorSchema);

module.exports = Donor;