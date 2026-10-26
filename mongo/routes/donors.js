const express = require('express');
const Donor = require('../models/Donor');

const router = express.Router();

function handleError(res, err) {
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({ error: messages.join('; ') });
    }
    if (err.name === 'CastError') {
        return res.status(400).json({ error: 'Некорректный id' });
    }
    if (err.code === 11000) {
        return res.status(409).json({ error: 'Донор с таким email уже существует' });
    }
    return res.status(500).json({ error: err.message });
}

const fixBloodType = (value) => String(value).replace(' ', '+');

router.get('/', async (req, res) => {
    try {
        const filter = {};
        if (req.query.bloodType) filter.bloodType = fixBloodType(req.query.bloodType);
        if (req.query.city) filter['address.city'] = req.query.city;
        if (req.query.contraindication) {
            filter.contraindications = req.query.contraindication;
        }

        const donors = await Donor.find(filter).sort({ createdAt: 1 });
        res.json(donors);
    } catch (err) {
        handleError(res, err);
    }
});

router.get('/stats', async (req, res) => {
    try {
        const stats = await Donor.aggregate([
            { $unwind: '$donations' },
            { $match: { 'donations.status': 'completed' } },
            {
                $group: {
                    _id: '$bloodType',
                    donors: { $addToSet: '$_id' },
                    donationsCount: { $sum: 1 },
                    totalVolumeMl: { $sum: '$donations.volumeMl' }
                }
            },
            {
                $project: {
                    _id: 0,
                    bloodType: '$_id',
                    donorsCount: { $size: '$donors' },
                    donationsCount: 1,
                    totalVolumeMl: 1
                }
            },
            { $sort: { totalVolumeMl: -1 } }
        ]);
        res.json(stats);
    } catch (err) {
        handleError(res, err);
    }
});

router.get('/:id', async (req, res) => {
    try {
        const donor = await Donor.findById(req.params.id);
        if (!donor) return res.status(404).json({ error: 'Донор не найден' });
        res.json(donor);
    } catch (err) {
        handleError(res, err);
    }
});

router.post('/', async (req, res) => {
    try {
        const donor = await Donor.create(req.body);
        res.status(201).json(donor);
    } catch (err) {
        handleError(res, err);
    }
});

router.put('/:id', async (req, res) => {
    try {
        const donor = await Donor.findByIdAndUpdate(req.params.id, req.body, {
            returnDocument: 'after',
            runValidators: true
        });
        if (!donor) return res.status(404).json({ error: 'Донор не найден' });
        res.json(donor);
    } catch (err) {
        handleError(res, err);
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const donor = await Donor.findByIdAndDelete(req.params.id);
        if (!donor) return res.status(404).json({ error: 'Донор не найден' });
        res.json({ message: 'Донор удалён', donor });
    } catch (err) {
        handleError(res, err);
    }
});

router.post('/:id/donations', async (req, res) => {
    try {
        const donor = await Donor.findByIdAndUpdate(
            req.params.id,
            { $push: { donations: req.body } },
            { returnDocument: 'after', runValidators: true }
        );
        if (!donor) return res.status(404).json({ error: 'Донор не найден' });
        res.status(201).json(donor);
    } catch (err) {
        handleError(res, err);
    }
});

router.patch('/:id/donations/:donationId', async (req, res) => {
    try {
        const set = {};
        for (const key of ['date', 'volumeMl', 'center', 'status']) {
            if (req.body[key] !== undefined) set[`donations.$.${key}`] = req.body[key];
        }

        const update = {};
        if (Object.keys(set).length) update.$set = set;

        if (req.body.increaseVolumeMl !== undefined) {
            if (set['donations.$.volumeMl'] !== undefined) {
                return res.status(400).json({ error: 'Укажите либо volumeMl, либо increaseVolumeMl' });
            }
            update.$inc = { 'donations.$.volumeMl': Number(req.body.increaseVolumeMl) };
        }
        if (!Object.keys(update).length) {
            return res.status(400).json({ error: 'Нет полей для изменения' });
        }

        const donor = await Donor.findOneAndUpdate(
            { _id: req.params.id, 'donations._id': req.params.donationId },
            update,
            { returnDocument: 'after', runValidators: true }
        );
        if (!donor) return res.status(404).json({ error: 'Донор или донация не найдены' });
        res.json(donor);
    } catch (err) {
        handleError(res, err);
    }
});

router.delete('/:id/donations/:donationId', async (req, res) => {
    try {
        const donor = await Donor.findOneAndUpdate(
            { _id: req.params.id, 'donations._id': req.params.donationId },
            { $pull: { donations: { _id: req.params.donationId } } },
            { returnDocument: 'after' }
        );
        if (!donor) return res.status(404).json({ error: 'Донор или донация не найдены' });
        res.json(donor);
    } catch (err) {
        handleError(res, err);
    }
});

module.exports = router;