import { useState } from 'react';
import { login, getErrorMessage } from '../api';

function LoginForm({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await login(email, password);
            onLogin();
        } catch (err) {
            
            setError(err.response?.data?.error || getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app">
            <div className="header">
                <h1>Платформа донорства крови</h1>
                <p>Вход в систему</p>
            </div>

            <form className="form-card login-card" onSubmit={handleSubmit}>
                <h3>Войти</h3>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                {error && <div className="form-error">{error}</div>}
                <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Вход...' : 'Войти'}
                </button>
            </form>
        </div>
    );
}

export default LoginForm;
