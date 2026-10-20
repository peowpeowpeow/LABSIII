import { useState, useEffect, useCallback } from 'react';
import {
    fetchDonors, addDonor, updateDonor, deleteDonor, getErrorMessage
} from '../api';
import { withRetry } from '../utils/retry';
import Toast from './Toast';
import '../App.css';

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const emptyForm = { fullName: '', bloodType: 'A+', phone: '', email: '' };
const MAX_RETRIES = 3;

function DonorList({ onLogout }) {
    const [donors, setDonors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [attempt, setAttempt] = useState(1);
    const [reloadKey, setReloadKey] = useState(0);

    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [filterType, setFilterType] = useState('all');

    const [toast, setToast] = useState(null);
    const showToast = (text, type = 'error') => setToast({ text, type, id: Date.now() });
    const closeToast = useCallback(() => setToast(null), []);

    useEffect(() => {
        const controller = new AbortController();

        setLoading(true);
        setError(null);

        withRetry(() => fetchDonors(controller.signal), {
            retries: MAX_RETRIES,
            delay: 1000,
            signal: controller.signal,
            onAttempt: setAttempt
        })
            .then((data) => setDonors(data))
            .catch((err) => {
                if (!controller.signal.aborted) setError(getErrorMessage(err));
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [reloadKey]);

    useEffect(() => {
        document.title = `Доноров: ${donors.length}`;
    }, [donors.length]);

    const handleAdd = async (data) => {
        const tempId = Date.now();
        setDonors((prev) => [...prev, { ...data, id: tempId, pending: true }]);
        try {
            const saved = await addDonor(data);
            setDonors((prev) => prev.map((d) => (d.id === tempId ? saved : d)));
            showToast('Донор добавлен', 'success');
        } catch (err) {
            setDonors((prev) => prev.filter((d) => d.id !== tempId));
            showToast(`Не удалось добавить: ${getErrorMessage(err)}`);
        }
    };

    const handleUpdate = async (id, data) => {
        const old = donors.find((d) => d.id === id);
        setDonors((prev) => prev.map((d) => (d.id === id ? { ...d, ...data, pending: true } : d)));
        try {
            const saved = await updateDonor(id, data);
            setDonors((prev) => prev.map((d) => (d.id === id ? saved : d)));
            showToast('Изменения сохранены', 'success');
        } catch (err) {
            setDonors((prev) => prev.map((d) => (d.id === id ? old : d)));
            showToast(`Не удалось сохранить: ${getErrorMessage(err)}`);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Удалить донора?')) return;

        const index = donors.findIndex((d) => d.id === id);
        const removed = donors[index];
        setDonors((prev) => prev.filter((d) => d.id !== id));
        try {
            await deleteDonor(id);
            showToast('Донор удалён', 'success');
        } catch (err) {
            setDonors((prev) => {
                const copy = [...prev];
                copy.splice(index, 0, removed);
                return copy;
            });
            showToast(`Не удалось удалить: ${getErrorMessage(err)}`);
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.fullName.trim() || !form.phone.trim()) {
            showToast('Заполните ФИО и телефон');
            return;
        }
        const data = { ...form };
        const id = editingId;
        setForm(emptyForm);
        setEditingId(null);
        if (id) handleUpdate(id, data);
        else handleAdd(data);
    };

    const handleEdit = (donor) => {
        setEditingId(donor.id);
        setForm({
            fullName: donor.fullName,
            bloodType: donor.bloodType,
            phone: donor.phone,
            email: donor.email || ''
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setForm(emptyForm);
    };

    const filteredDonors = filterType === 'all'
        ? donors
        : donors.filter((d) => d.bloodType === filterType);

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
                <p>Загрузка данных...</p>
                {attempt > 1 && (
                    <p className="retry-info">Сервер не отвечает. Попытка {attempt} из {MAX_RETRIES}</p>
                )}
            </div>
        );
    }

    if (error) {
        return (
            <div className="app">
                <div className="error-box">
                    <h3>Не удалось загрузить данные</h3>
                    <p>{error}</p>
                    <p className="retry-info">Выполнено попыток: {attempt} из {MAX_RETRIES}</p>
                    <button className="btn-primary" onClick={() => setReloadKey((k) => k + 1)}>
                        Повторить
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            <div className="header">
                <h1>Платформа донорства крови</h1>
                <p>Управление базой доноров</p>
                <button className="btn-logout" onClick={onLogout}>Выйти</button>
            </div>

            <form className="form-card" onSubmit={handleSubmit}>
                <h3>{editingId ? 'Редактировать донора' : 'Добавить донора'}</h3>
                <div className="form-grid">
                    <input name="fullName" type="text" placeholder="ФИО"
                        value={form.fullName} onChange={handleChange} />
                    <select name="bloodType" value={form.bloodType} onChange={handleChange}>
                        {bloodTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input name="phone" type="text" placeholder="Телефон"
                        value={form.phone} onChange={handleChange} />
                    <input name="email" type="email" placeholder="Email"
                        value={form.email} onChange={handleChange} />
                </div>
                <div className="form-actions">
                    <button type="submit" className="btn-primary">
                        {editingId ? 'Сохранить' : 'Добавить'}
                    </button>
                    {editingId && (
                        <button type="button" className="btn-secondary" onClick={handleCancelEdit}>
                            Отмена
                        </button>
                    )}
                </div>
            </form>

            <div className="filter-bar">
                <label>Фильтр по группе крови:</label>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    <option value="all">Все</option>
                    {bloodTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <button className="btn-secondary" onClick={() => setReloadKey((k) => k + 1)}>
                    Обновить с сервера
                </button>
            </div>

            <div className="stats">
                <div className="stat-card">
                    <div className="stat-value">{donors.length}</div>
                    <div className="stat-label">Всего доноров</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{filteredDonors.length}</div>
                    <div className="stat-label">Показано</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{new Set(donors.map((d) => d.bloodType)).size}</div>
                    <div className="stat-label">Групп крови</div>
                </div>
            </div>

            {filteredDonors.length === 0 ? (
                <div className="empty-state">Доноров не найдено</div>
            ) : (
                <ul className="donor-list">
                    {filteredDonors.map((donor) => (
                        <li key={donor.id} className={`donor-item ${donor.pending ? 'pending' : ''}`}>
                            <div className="donor-info">
                                <div className="donor-name">
                                    {donor.fullName}
                                    {donor.pending && <span className="saving-badge">Сохранение...</span>}
                                </div>
                                <div className="donor-details">
                                    <span className="blood-badge">{donor.bloodType}</span>
                                    {donor.phone}{donor.email && ` • ${donor.email}`}
                                </div>
                            </div>
                            <div className="donor-actions">
                                <button className="btn-edit" disabled={donor.pending}
                                    onClick={() => handleEdit(donor)}>
                                    Изменить
                                </button>
                                <button className="btn-delete" disabled={donor.pending}
                                    onClick={() => handleDelete(donor.id)}>
                                    Удалить
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <Toast toast={toast} onClose={closeToast} />
        </div>
    );
}

export default DonorList;