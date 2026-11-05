import { useState, useEffect, useCallback } from 'react';
import { fetchMongoStats, fetchMongoDonors, addMongoDonation, syncMongoDatabases, getErrorMessage } from '../api';
import { withRetry } from '../utils/retry';

const MAX_RETRIES = 3;

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

function plural(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
}

function StatsPanel() {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [attempt, setAttempt] = useState(1);
    const [reloadKey, setReloadKey] = useState(0);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [mongoDonors, setMongoDonors] = useState([]);
    const [donationData, setDonationData] = useState({ donorId: '', volumeMl: 450, center: 'РНПЦ трансфузиологии' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const loadStats = useCallback((signal) => {
        withRetry(() => fetchMongoStats(signal), {
            retries: MAX_RETRIES,
            delay: 1000,
            signal: signal,
            onAttempt: setAttempt
        })
            .then((data) => setStats(Array.isArray(data) ? data : []))
            .catch((err) => {
                if (!signal.aborted) setError(getErrorMessage(err));
            })
            .finally(() => {
                if (!signal.aborted) setLoading(false);
            });
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(null);
        loadStats(controller.signal);
        return () => controller.abort();
    }, [reloadKey, loadStats]);

    const openModal = async () => {
        setIsModalOpen(true);
        try {
            const donors = await fetchMongoDonors();
            setMongoDonors(donors);
            if (donors.length > 0) {
                setDonationData(prev => ({ ...prev, donorId: donors[0]._id }));
            }
        } catch (err) {
            alert('Ошибка загрузки доноров из MongoDB');
        }
    };

    const handleAddDonation = async (e) => {
        e.preventDefault();
        if (!donationData.donorId) return;
        setIsSubmitting(true);
        try {
            await addMongoDonation(donationData.donorId, {
                volumeMl: Number(donationData.volumeMl),
                center: donationData.center,
                status: 'completed'
            });
            setIsModalOpen(false);
            setReloadKey(k => k + 1);
        } catch (err) {
            alert('Ошибка: ' + getErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const res = await syncMongoDatabases();
            alert(res.message);
            setReloadKey(k => k + 1);
        } catch (err) {
            alert('Ошибка: ' + getErrorMessage(err));
        } finally {
            setIsSyncing(false);
        }
    };

    if (loading) {
        return (
            <div className="stats-loading">
                <div className="spinner"></div>
                <p>Загрузка аналитики...</p>
                {attempt > 1 && <p className="retry-info">Попытка {attempt} из {MAX_RETRIES}</p>}
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-box">
                <h3>Не удалось загрузить аналитику</h3>
                <p>{error}</p>
                <button className="btn-primary" onClick={() => setReloadKey(k => k + 1)}>Повторить</button>
            </div>
        );
    }

    const totalDonors = stats.reduce((s, r) => s + r.donorsCount, 0);
    const totalDonations = stats.reduce((s, r) => s + r.donationsCount, 0);
    const totalVolume = stats.reduce((s, r) => s + r.totalVolumeMl, 0);
    const maxVolume = stats.reduce((m, r) => Math.max(m, r.totalVolumeMl), 0);

    return (
        <div className="analytics">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-main)', fontWeight: 600 }}>Аналитика</h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-secondary" onClick={handleSync} disabled={isSyncing}>
                        {isSyncing ? 'Синхронизация...' : 'Синхронизировать базы'}
                    </button>
                    <button className="btn-primary btn-add" onClick={openModal}>Добавить донацию</button>
                </div>
            </div>

            {stats.length === 0 ? (
                <div className="empty-state">Пока нет завершённых донаций — статистика пуста</div>
            ) : (
                <>
                    <div className="analytics-summary">
                        <div className="summary-card">
                            <div className="summary-value">{totalVolume.toLocaleString('ru-RU')}</div>
                            <div className="summary-label">Всего собрано, мл</div>
                        </div>
                        <div className="summary-card">
                            <div className="summary-value">{totalDonors}</div>
                            <div className="summary-label">{plural(totalDonors, 'Донор', 'Донора', 'Доноров')} с донациями</div>
                        </div>
                        <div className="summary-card">
                            <div className="summary-value">{totalDonations}</div>
                            <div className="summary-label">Завершённ{plural(totalDonations, 'ая', 'ые', 'ых')} донаци{plural(totalDonations, 'я', 'и', 'й')}</div>
                        </div>
                    </div>

                    <div className="chart-card">
                        <h3>Собрано крови по группам</h3>
                        <div className="chart-rows">
                            {stats.map((row) => {
                                const percent = maxVolume > 0 ? (row.totalVolumeMl / maxVolume) * 100 : 0;
                                return (
                                    <div className="chart-row" key={row.bloodType}>
                                        <div className="chart-row-header">
                                            <div className="chart-row-left">
                                                <span className="blood-badge" title={bloodTypeLabels[row.bloodType]}>
                                                    {row.bloodType}
                                                </span>
                                                <div className="chart-stats">
                                                    {row.totalVolumeMl.toLocaleString('ru-RU')} мл
                                                    <span>
                                                        {row.donorsCount} {plural(row.donorsCount, 'донор', 'донора', 'доноров')} · {row.donationsCount} {plural(row.donationsCount, 'донация', 'донации', 'донаций')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="chart-track">
                                            <div className="chart-bar" style={{ width: `${percent}%` }} />
                                        </div>
                                        <div className="chart-donors-list">
                                            Сдали: <b>{row.donorNames.join(', ')}</b>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setIsModalOpen(false)}>Закрыть</button>
                        <h3>Новая донация</h3>
                        <form onSubmit={handleAddDonation} className="modal-form-grid">
                            <select 
                                value={donationData.donorId} 
                                onChange={e => setDonationData({ ...donationData, donorId: e.target.value })}
                                required
                            >
                                <option value="" disabled>Выберите донора</option>
                                {mongoDonors.map(d => (
                                    <option key={d._id} value={d._id}>
                                        {d.fullName} — {bloodTypeLabels[d.bloodType] || d.bloodType}
                                    </option>
                                ))}
                            </select>
                            <input 
                                type="number" 
                                placeholder="Объём (мл)" 
                                value={donationData.volumeMl} 
                                onChange={e => setDonationData({ ...donationData, volumeMl: e.target.value })}
                                min="200" max="650" required 
                            />
                            <input 
                                type="text" 
                                placeholder="Центр переливания" 
                                value={donationData.center} 
                                onChange={e => setDonationData({ ...donationData, center: e.target.value })}
                                required 
                            />
                            <div className="modal-actions" style={{ marginTop: '10px' }}>
                                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? 'Сохранение...' : 'Добавить'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default StatsPanel;