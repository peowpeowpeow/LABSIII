const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    room: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: [500, 'Сообщение длиннее 500 символов']
    }
}, {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false
});

messageSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);