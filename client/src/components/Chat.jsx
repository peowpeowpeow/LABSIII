import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import '../App.css';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const formatTime = (date) =>
    new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

function Chat() {
    const [connected, setConnected] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [room, setRoom] = useState('Общий чат');
    const [messages, setMessages] = useState([]);
    const [usersInRoom, setUsersInRoom] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [text, setText] = useState('');
    const [error, setError] = useState(null);
    const [urgent, setUrgent] = useState({ bloodType: 'O-', center: '' });

    const socketRef = useRef(null);
    const roomRef = useRef(room);
    const typingTimer = useRef(null);
    const bottomRef = useRef(null);

    const addSystem = (textValue) =>
        setMessages((prev) => [...prev, { system: true, text: textValue, createdAt: new Date() }]);

    const joinRoom = (name) => {
        roomRef.current = name;
        setRoom(name);
        setTypingUsers([]);
        socketRef.current.emit('join room', name, (res) => {
            if (!res?.ok) return setError(res?.error || 'Не удалось войти в комнату');
            setMessages(res.history);
            setError(null);
        });
    };

    useEffect(() => {
        const socket = io(import.meta.env.VITE_API_URL, {
            auth: { token: localStorage.getItem('token') }
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            joinRoom(roomRef.current);
        });

        socket.on('disconnect', (reason) => {
            setConnected(false);
            if (reason !== 'io client disconnect') addSystem('Соединение потеряно, переподключение...');
        });

        socket.on('connect_error', (err) => {
            setError(`Ошибка подключения: ${err.message}`);
            if (err.message === 'Недействительный токен') {
                localStorage.removeItem('token');
                window.dispatchEvent(new Event('logout'));
            }
        });

        socket.on('rooms', setRooms);
        socket.on('chat message', (msg) => {
            if (msg.room === roomRef.current) setMessages((prev) => [...prev, msg]);
        });
        socket.on('system', (msg) => addSystem(msg.text));
        socket.on('room users', setUsersInRoom);
        socket.on('typing', ({ email, isTyping }) => {
            setTypingUsers((prev) =>
                isTyping ? [...new Set([...prev, email])] : prev.filter((u) => u !== email));
        });
        socket.on('urgent request', (alert) => setAlerts((prev) => [alert, ...prev].slice(0, 3)));

        return () => {
            clearTimeout(typingTimer.current);
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleInput = (e) => {
        setText(e.target.value);
        socketRef.current.emit('typing', true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => socketRef.current.emit('typing', false), 1500);
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        clearTimeout(typingTimer.current);
        socketRef.current.emit('typing', false);
        socketRef.current.emit('chat message', text, (res) => {
            if (res?.ok) {
                setText('');
                setError(null);
            } else {
                setError(res?.error || 'Сообщение не отправлено');
            }
        });
    };

    const sendUrgent = (e) => {
        e.preventDefault();
        socketRef.current.emit('urgent request', urgent, (res) => {
            if (res?.ok) {
                setUrgent({ ...urgent, center: '' });
                setError(null);
            } else {
                setError(res?.error);
            }
        });
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-main)', fontWeight: 600 }}>Чат доноров</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                        <span className={`status-dot ${connected ? 'online' : 'offline'}`}></span>
                        {connected ? 'В сети' : 'Нет соединения'}
                    </p>
                </div>
            </div>

            {alerts.map((a, i) => (
                <div key={i} className="urgent-alert">
                    Срочно нужна кровь <b>{a.bloodType}</b> — {a.center}
                    <span className="alert-meta"> ({a.author}, {formatTime(a.createdAt)})</span>
                </div>
            ))}

            <div className="chat-layout">
                <aside className="chat-sidebar">
                    <h3>Комнаты</h3>
                    {rooms.map((name) => (
                        <button
                            key={name}
                            className={`room-btn ${name === room ? 'active' : ''}`}
                            onClick={() => joinRoom(name)}
                            disabled={!connected}
                        >
                            {name}
                        </button>
                    ))}

                    <h3>В комнате ({usersInRoom.length})</h3>
                    <ul className="users-list">
                        {usersInRoom.map((u) => <li key={u}>{u}</li>)}
                    </ul>

                    <h3>Срочный запрос</h3>
                    <form className="urgent-form" onSubmit={sendUrgent} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <select
                            value={urgent.bloodType}
                            onChange={(e) => setUrgent({ ...urgent, bloodType: e.target.value })}
                        >
                            {BLOOD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <input
                            placeholder="Центр"
                            value={urgent.center}
                            onChange={(e) => setUrgent({ ...urgent, center: e.target.value })}
                        />
                        <button type="submit" className="btn-delete" disabled={!connected}>
                            Отправить всем
                        </button>
                    </form>
                </aside>

                <section className="chat-main">
                    <div className="chat-room-title">{room}</div>
                    <div className="chat-messages">
                        {messages.length === 0 && <div className="chat-empty">Сообщений пока нет</div>}
                        {messages.map((m, i) => m.system ? (
                            <div key={i} className="msg-system">{m.text}</div>
                        ) : (
                            <div key={m._id || i} className="msg">
                                <div className="msg-head">
                                    <b>{m.author}</b> <span>{formatTime(m.createdAt)}</span>
                                </div>
                                <div className="msg-text">{m.text}</div>
                            </div>
                        ))}
                        <div ref={bottomRef}></div>
                    </div>

                    <div className="typing">
                        {typingUsers.length > 0 && `${typingUsers.join(', ')} печатает...`}
                    </div>

                    {error && <div className="form-error">{error}</div>}

                    <form className="chat-form" onSubmit={sendMessage}>
                        <input
                            value={text}
                            onChange={handleInput}
                            placeholder="Сообщение..."
                            maxLength={500}
                            disabled={!connected}
                        />
                        <button type="submit" className="btn-primary" disabled={!connected}>
                            Отправить
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
}

export default Chat;