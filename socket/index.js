const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Message = require('../mongo/models/Message');

const ROOMS = ['Общий чат', 'РНПЦ трансфузиологии', 'Гомельская ОСПК'];
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const MAX_LENGTH = 500;
const RATE_LIMIT = { count: 5, perMs: 5000 };
const HISTORY_SIZE = 50;

const users = new Map();

function roomUsers(room) {
    const emails = [...users.values()].filter((u) => u.room === room).map((u) => u.email);
    return [...new Set(emails)];
}

const systemMessage = (text) => ({ text, createdAt: new Date() });
const mongoReady = () => mongoose.connection.readyState === 1;

async function loadHistory(room) {
    if (!mongoReady()) return [];
    const messages = await Message.find({ room }).sort({ createdAt: -1 }).limit(HISTORY_SIZE).lean();
    return messages.reverse();
}

function initSocket(server) {
    const io = new Server(server, {
        cors: { origin: 'http://localhost:5173' },
        maxHttpBufferSize: 1e4
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('Токен не предоставлен'));
        try {
            socket.user = jwt.verify(token, process.env.JWT_SECRET);
            next();
        } catch (err) {
            next(new Error('Недействительный токен'));
        }
    });

    io.on('connection', (socket) => {
        const email = socket.user.email;
        users.set(socket.id, { email, room: null });
        socket.data.sentAt = [];
        console.log(`Socket: подключился ${email} (${socket.id})`);

        socket.emit('rooms', ROOMS);

        socket.on('join room', async (room, ack) => {
            if (!ROOMS.includes(room)) return ack?.({ ok: false, error: 'Нет такой комнаты' });
            const user = users.get(socket.id);
            const prev = user.room;
            if (prev && prev !== room) {
                socket.leave(prev);
                user.room = null;
                socket.to(prev).emit('system', systemMessage(`${email} вышел из комнаты`));
                io.to(prev).emit('room users', roomUsers(prev));
            }
            socket.join(room);
            user.room = room;
            if (prev !== room) {
                socket.to(room).emit('system', systemMessage(`${email} присоединился к чату`));
            }
            io.to(room).emit('room users', roomUsers(room));
            try {
                ack?.({ ok: true, history: await loadHistory(room) });
            } catch (err) {
                console.error('Ошибка загрузки истории:', err.message);
                ack?.({ ok: true, history: [] });
            }
        });

        socket.on('chat message', async (rawText, ack) => {
            const user = users.get(socket.id);
            const text = typeof rawText === 'string' ? rawText.trim() : '';
            if (!user.room) return ack?.({ ok: false, error: 'Сначала выберите комнату' });
            if (!text) return ack?.({ ok: false, error: 'Пустое сообщение' });
            if (text.length > MAX_LENGTH) return ack?.({ ok: false, error: `Не больше ${MAX_LENGTH} символов` });

            const now = Date.now();
            socket.data.sentAt = socket.data.sentAt.filter((t) => now - t < RATE_LIMIT.perMs);
            if (socket.data.sentAt.length >= RATE_LIMIT.count) return ack?.({ ok: false, error: 'Слишком часто. Подождите пару секунд' });
            socket.data.sentAt.push(now);

            let message = { room: user.room, author: email, text, createdAt: new Date() };
            if (mongoReady()) {
                try {
                    const saved = await Message.create(message);
                    message = saved.toObject();
                } catch (err) {
                    console.error('Ошибка сохранения сообщения:', err.message);
                }
            }
            io.to(user.room).emit('chat message', message);
            ack?.({ ok: true });
        });

        socket.on('typing', (isTyping) => {
            const user = users.get(socket.id);
            if (user.room) socket.to(user.room).emit('typing', { email, isTyping: Boolean(isTyping) });
        });

        socket.on('urgent request', (data, ack) => {
            const bloodType = data?.bloodType;
            const center = typeof data?.center === 'string' ? data.center.trim() : '';
            if (!BLOOD_TYPES.includes(bloodType)) return ack?.({ ok: false, error: 'Неизвестная группа крови' });
            if (!center) return ack?.({ ok: false, error: 'Укажите центр' });
            io.emit('urgent request', { bloodType, center, author: email, createdAt: new Date() });
            ack?.({ ok: true });
        });

        socket.on('disconnect', (reason) => {
            const user = users.get(socket.id);
            users.delete(socket.id);
            console.log(`Socket: отключился ${email} (${reason})`);
            if (user?.room) {
                socket.to(user.room).emit('system', systemMessage(`${email} отключился`));
                io.to(user.room).emit('room users', roomUsers(user.room));
            }
        });
    });

    return io;
}

module.exports = initSocket;