const express = require('express');
const Donor = require('../models/Donor');
const mongoose = require('mongoose');

const router = express.Router();

const fixBloodType = (value) => String(value).replace(' ', '+');

const handleError = (err, res) => {
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map((e) => e.message).join('; ');
        return res.status(400).json({ error: messages });
    }
    if (err.name === 'CastError') {
        return res.status(400).json({ error: 'Некорректный id' });
    }
    if (err.code === 11000) {
        return res.status(409).json({ error: 'Донор с таким email уже существует' });
    }
    res.status(500).json({ error: err.message });
};

router.get('/', async (req, res) => {
    try {
        const filter = {};
        if (req.query.bloodType) filter.bloodType = fixBloodType(req.query.bloodType);
        if (req.query.city) filter['address.city'] = req.query.city;
        if (req.query.contraindication) filter.contraindications = req.query.contraindication;

        const donors = await Donor.find(filter).sort({ createdAt: -1 });
        res.json(donors);
    } catch (err) {
        handleError(err, res);
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
                    donors: { $addToSet: '$fullName' },
                    donationsCount: { $sum: 1 },
                    totalVolumeMl: { $sum: '$donations.volumeMl' }
                }
            },
            {
                $project: {
                    _id: 0,
                    bloodType: '$_id',
                    donorsCount: { $size: '$donors' },
                    donorNames: '$donors',
                    donationsCount: 1,
                    totalVolumeMl: 1
                }
            },
            { $sort: { totalVolumeMl: -1 } }
        ]);
        res.json(stats);
    } catch (err) {
        handleError(err, res);
    }
});

router.get('/:id', async (req, res) => {
    try {
        const donor = await Donor.findById(req.params.id);
        if (!donor) return res.status(404).json({ error: 'Донор не найден' });
        res.json(donor);
    } catch (err) {
        handleError(err, res);
    }
});

router.post('/', async (req, res) => {
    try {
        const donor = await Donor.create(req.body);
        res.status(201).json(donor);
    } catch (err) {
        handleError(err, res);
    }
});

router.put('/:id', async (req, res) => {
    try {
        const donor = await Donor.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!donor) return res.status(404).json({ error: 'Донор не найден' });
        res.json(donor);
    } catch (err) {
        handleError(err, res);
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const donor = await Donor.findByIdAndDelete(req.params.id);
        if (!donor) return res.status(404).json({ error: 'Донор не найден' });
        res.status(204).send();
    } catch (err) {
        handleError(err, res);
    }
});

router.post('/:id/donations', async (req, res) => {
    try {
        const donor = await Donor.findById(req.params.id);
        if (!donor) return res.status(404).json({ error: 'Донор не найден' });
        
        donor.donations.push(req.body);
        await donor.save();
        
        res.status(201).json(donor);
    } catch (err) {
        handleError(err, res);
    }
});

router.patch('/:id/donations/:donationId', async (req, res) => {
    try {
        const { id, donationId } = req.params;
        const update = {};
        const arrayFilters = [];

        for (const key of ['date', 'volumeMl', 'center', 'status']) {
            if (req.body[key] !== undefined) {
                update[`donations.$[elem].${key}`] = req.body[key];
            }
        }

        if (req.body.increaseVolumeMl !== undefined) {
            if (update['donations.$[elem].volumeMl'] !== undefined) {
                return res.status(400).json({ error: 'Укажите либо volumeMl, либо increaseVolumeMl' });
            }
            update.$inc = { 'donations.$[elem].volumeMl': Number(req.body.increaseVolumeMl) };
        }

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ error: 'Нет данных для обновления' });
        }

        const donor = await Donor.findOneAndUpdate(
            { _id: id, 'donations._id': donationId },
            update,
            { 
                new: true, 
                runValidators: true,
                arrayFilters: [{ 'elem._id': new mongoose.Types.ObjectId(donationId) }]
            }
        );

        if (!donor) return res.status(404).json({ error: 'Донация не найдена' });
        res.json(donor);
    } catch (err) {
        handleError(err, res);
    }
});

router.delete('/:id/donations/:donationId', async (req, res) => {
    try {
        const donor = await Donor.findOneAndUpdate(
            { _id: req.params.id, 'donations._id': req.params.donationId },
            { $pull: { donations: { _id: req.params.donationId } } },
            { new: true }
        );
        if (!donor) return res.status(404).json({ error: 'Донация не найдена' });
        res.json(donor);
    } catch (err) {
        handleError(err, res);
    }
});

module.exports = router;