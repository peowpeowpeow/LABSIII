import axios from 'axios';


const DONORS_URL = '/donors';
const LOGIN_URL = '/auth/login';
const MONGO_STATS_URL = '/mongo/donors/stats';
const MONGO_DONORS_URL = '/mongo/donors';
const MONGO_SYNC_URL = '/mongo/sync';


const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 5000 
});


api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});


api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isLogin = error.config?.url === LOGIN_URL;
        if (error.response?.status === 401 && !isLogin) {
            localStorage.removeItem('token');
            window.dispatchEvent(new Event('logout'));
        }
        return Promise.reject(error);
    }
);


const fromServer = (d) => ({
    id: d.id,
    fullName: d.fullName,
    bloodType: d.bloodType,
    phone: d.phone,
    email: d.email || '',
    registrationDate: d.registrationDate || ''
});

const toServer = (d) => ({
    fullName: d.fullName,
    bloodType: d.bloodType,
    phone: d.phone,
    email: d.email || null,
    registrationDate: d.registrationDate || null
});


export async function login(email, password) {
    const res = await api.post(LOGIN_URL, { email, password });
    localStorage.setItem('token', res.data.token);
    return res.data.token;
}

export function logout() {
    localStorage.removeItem('token');
}


export async function fetchDonors(signal) {
    const res = await api.get(DONORS_URL, { signal });
    return res.data.map(fromServer);
}


export async function addDonor(donor) {
    const res = await api.post(DONORS_URL, toServer(donor));
    return fromServer(res.data);
}


export async function updateDonor(id, donor) {
    const res = await api.put(`${DONORS_URL}/${id}`, toServer(donor));
    return fromServer(res.data);
}


export function deleteDonor(id) {
    return api.delete(`${DONORS_URL}/${id}`);
}


export async function fetchMongoStats(signal) {
    const res = await api.get(MONGO_STATS_URL, { signal });
    return res.data;
}


export async function fetchMongoDonors(signal) {
    const res = await api.get(MONGO_DONORS_URL, { signal });
    return res.data;
}


export async function addMongoDonation(donorId, donation) {
    const res = await api.post(`${MONGO_DONORS_URL}/${donorId}/donations`, donation);
    return res.data;
}


export async function syncMongoDatabases() {
    const res = await api.post(MONGO_SYNC_URL);
    return res.data;
}


export function getErrorMessage(err) {
    if (axios.isCancel(err)) return 'Запрос отменён';
    if (err.code === 'ECONNABORTED') return 'Сервер не ответил вовремя';
    if (!err.response) return 'Сервер недоступен. Проверьте, что он запущен';

    const { status, data } = err.response;
    if (status === 401) return 'Нужно войти в систему';
    if (status === 403) return 'Нет прав на это действие';
    if (status >= 500) return `Ошибка сервера (${status})`;
    
    return data?.error || `Ошибка ${status}`;
}