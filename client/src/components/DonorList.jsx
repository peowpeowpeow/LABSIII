import { useState, useEffect, useCallback } from 'react';
import {
    fetchDonors, addDonor, updateDonor, deleteDonor, getErrorMessage
} from '../api';
import { withRetry } from '../utils/retry';
import Toast from './Toast';
import '../App.css';

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const bloodTypeLabels = {
    'A+': 'A+ (Вторая положительная)',
    'A-': 'A- (Вторая отрицательная)',
    'B+': 'B+ (Третья положительная)',
    'B-': 'B- (Третья отрицательная)',
    'AB+': 'AB+ (Четвертая положительная)',
    'AB-': 'AB- (Четвертая отрицательная)',
    'O+': 'O+ (Первая положительная)',
    'O-': 'O- (Первая отрицательная)'
};

const emptyForm = { fullName: '', bloodType: 'A+', phone: '', email: '', registrationDate: new Date().toISOString().split('T')[0] };
const MAX_RETRIES = 3;

function DonorList() {
    const [donors, setDonors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [attempt, setAttempt] = useState(1);
    const [reloadKey, setReloadKey] = useState(0);

    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [filterType, setFilterType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

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
        setIsModalOpen(false);

        if (id) handleUpdate(id, data);
        else handleAdd(data);
    };

    const openAddModal = () => {
        setEditingId(null);
        setForm(emptyForm);
        setIsModalOpen(true);
    };

    const handleEdit = (donor) => {
        setEditingId(donor.id);
        setForm({
            fullName: donor.fullName,
            bloodType: donor.bloodType,
            phone: donor.phone,
            email: donor.email || '',
            registrationDate: donor.registrationDate || ''
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setForm(emptyForm);
    };

    const filteredDonors = donors.filter((d) => {
        const matchesFilter = filterType === 'all' || d.bloodType === filterType;
        const matchesSearch = d.fullName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const exportToCSV = () => {
        const headers = ['ID', 'ФИО', 'Группа крови', 'Телефон', 'Email', 'Дата записи'];
        const rows = filteredDonors.map(d => [
            d.id,
            d.fullName,
            d.bloodType,
            d.phone,
            d.email || '',
            d.registrationDate || ''
        ]);

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
            + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `donors_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
                <p>Загрузка данных...</p>
                {attempt > 1 && <p className="retry-info">Сервер не отвечает. Попытка {attempt} из {MAX_RETRIES}</p>}
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-box">
                <h3>Не удалось загрузить данные</h3>
                <p>{error}</p>
                <button className="btn-primary" onClick={() => setReloadKey((k) => k + 1)}>Повторить</button>
            </div>
        );
    }

    return (
        <>
            <div className="stats top-stats">
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

            <div className="right-panel">
                <div className="filter-bar">
                    <input
                        type="text"
                        placeholder="Поиск по ФИО..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                        <option value="all">Все группы</option>
                        {bloodTypes.map((t) => <option key={t} value={t}>{bloodTypeLabels[t]}</option>)}
                    </select>
                    <button className="btn-secondary" onClick={() => setReloadKey((k) => k + 1)}>Обновить</button>
                    <button className="btn-export" onClick={exportToCSV}>В CSV</button>
                    <button className="btn-primary btn-add" onClick={openAddModal}>+ Добавить</button>
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
                                        <span>{donor.phone}</span>
                                        {donor.email && <span>{donor.email}</span>}
                                        {donor.registrationDate && <span>Дата записи: {donor.registrationDate}</span>}
                                    </div>
                                </div>
                                <div className="donor-actions">
                                    <button className="btn-edit" disabled={donor.pending} onClick={() => handleEdit(donor)}>Изменить</button>
                                    <button className="btn-delete" disabled={donor.pending} onClick={() => handleDelete(donor.id)}>Удалить</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {isModalOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={closeModal}>Закрыть</button>
                        <h3>{editingId ? 'Редактировать донора' : 'Добавить донора'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-form-grid">
                                <input name="fullName" type="text" placeholder="ФИО" value={form.fullName} onChange={handleChange} />
                                <select name="bloodType" value={form.bloodType} onChange={handleChange}>
                                    {bloodTypes.map((t) => <option key={t} value={t}>{bloodTypeLabels[t]}</option>)}
                                </select>
                                <input name="phone" type="text" placeholder="Телефон" value={form.phone} onChange={handleChange} />
                                <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} />
                                <input 
                                    name="registrationDate" 
                                    type="date" 
                                    value={form.registrationDate} 
                                    onChange={handleChange} 
                                    title="Дата регистрации"
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="submit" className="btn-primary">
                                    {editingId ? 'Сохранить' : 'Добавить'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <Toast toast={toast} onClose={closeToast} />
        </>
    );
}

export default DonorList;