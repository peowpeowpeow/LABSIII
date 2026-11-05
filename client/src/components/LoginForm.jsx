import { useState, useEffect } from 'react';
import { login, getErrorMessage } from '../api';
import '../App.css';

function LoginForm({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const savedEmail = localStorage.getItem('savedEmail');
        const savedPassword = localStorage.getItem('savedPassword');
        if (savedEmail && savedPassword) {
            setEmail(savedEmail);
            setPassword(savedPassword);
            setRememberMe(true);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await login(email, password);
            if (rememberMe) {
                localStorage.setItem('savedEmail', email);
                localStorage.setItem('savedPassword', password);
            } else {
                localStorage.removeItem('savedEmail');
                localStorage.removeItem('savedPassword');
            }
            onLogin();
        } catch (err) {
            setError(err.response?.data?.error || getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            <form className="login-card" onSubmit={handleSubmit}>
                <h3>Вход в систему</h3>
                
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
                
                <label className="remember-me">
                    <input 
                        type="checkbox" 
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)} 
                    />
                    Запомнить меня
                </label>

                {error && <div className="form-error">{error}</div>}
                
                <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Вход...' : 'Войти'}
                </button>
            </form>
        </div>
    );
}

export default LoginForm;