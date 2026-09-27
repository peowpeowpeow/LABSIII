import { useState, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import '../App.css';

const initialDonors = [
    {
        id: 1,
        fullName: 'Иванов Иван Иванович',
        bloodType: 'A+',
        phone: '+375291234567',
        city: 'Минск'
    },
    {
        id: 2,
        fullName: 'Петрова Анна Сергеевна',
        bloodType: 'B-',
        phone: '+375295678901',
        city: 'Гомель'
    }
];

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function DonorList() {
    const [donors, setDonors] = useLocalStorage('donors', initialDonors);

    const [fullName, setFullName] = useState('');
    const [bloodType, setBloodType] = useState('A+');
    const [phone, setPhone] = useState('');
    const [city, setCity] = useState('');

    const [filterType, setFilterType] = useState('all');
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        document.title = `Доноров: ${donors.length}`;
    }, [donors.length]);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!fullName.trim() || !phone.trim()) {
            alert('Заполните ФИО и телефон');
            return;
        }

        if (editingId) {
            setDonors(donors.map(d =>
                d.id === editingId
                    ? { ...d, fullName, bloodType, phone, city }
                    : d
            ));
            setEditingId(null);
        } else {
            setDonors([...donors, {
                id: Date.now(),
                fullName,
                bloodType,
                phone,
                city
            }]);
        }

        setFullName('');
        setBloodType('A+');
        setPhone('');
        setCity('');
    };
const handleDelete = (id) => {
        if (window.confirm('Удалить донора?')) {
            setDonors(donors.filter(d => d.id !== id));
        }
    };

    const handleEdit = (donor) => {
        setEditingId(donor.id);
        setFullName(donor.fullName);
        setBloodType(donor.bloodType);
        setPhone(donor.phone);
        setCity(donor.city);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFullName('');
        setBloodType('A+');
        setPhone('');
        setCity('');
    };

    const filteredDonors = filterType === 'all'
        ? donors
        : donors.filter(d => d.bloodType === filterType);

    if (loading) {
        return <div className="loading">Загрузка данных...</div>;
    }

    return (
        <div className="app">
            <div className="header">
                <h1>Платформа донорства крови</h1>
                <p>Управление базой доноров</p>
            </div>

            {/* Форма */}
            <form className="form-card" onSubmit={handleSubmit}>
                <h3>{editingId ? 'Редактировать донора' : 'Добавить донора'}</h3>
                <div className="form-grid">
                    <input
                        type="text"
                        placeholder="ФИО"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                    />
                    <select
                        value={bloodType}
                        onChange={(e) => setBloodType(e.target.value)}
                    >
                        {bloodTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input
                        type="text"
                        placeholder="Телефон"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Город"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                    />
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

            {}
            <div className="filter-bar">
                <label>Фильтр по группе крови:</label>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    <option value="all">Все</option>
                    {bloodTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            {}
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
                    <div className="stat-value">
                        {new Set(donors.map(d => d.bloodType)).size}
                    </div>
                    <div className="stat-label">Групп крови</div>
                </div>
            </div>
{}
            {filteredDonors.length === 0 ? (
                <div className="empty-state">Доноров не найдено</div>
            ) : (
                <ul className="donor-list">
                    {filteredDonors.map(donor => (
                        <li key={donor.id} className="donor-item">
                            <div className="donor-info">
                                <div className="donor-name">{donor.fullName}</div>
                                <div className="donor-details">
                                    <span className="blood-badge">{donor.bloodType}</span>
                                    {donor.phone} • {donor.city}
                                </div>
                            </div>
                            <div className="donor-actions">
                                <button className="btn-edit" onClick={() => handleEdit(donor)}>
                                    Изменить
                                </button>
                                <button className="btn-delete" onClick={() => handleDelete(donor.id)}>
                                    Удалить
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default DonorList;