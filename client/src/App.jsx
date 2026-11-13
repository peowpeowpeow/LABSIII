import { useState, useEffect } from 'react';
import DonorList from './components/DonorList';
import LoginForm from './components/LoginForm';
import Chat from './components/Chat';
import StatsPanel from './components/StatsPanel';
import Profile from './components/Profile';
import { logout } from './api';
import './App.css';

function App() {
    const [isAuth, setIsAuth] = useState(() => !!localStorage.getItem('token'));
    const [page, setPage] = useState('donors');
    
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) return savedTheme;
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'dark' : 'light';
    });

    useEffect(() => {
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const handler = () => setIsAuth(false);
        window.addEventListener('logout', handler);
        return () => window.removeEventListener('logout', handler);
    }, []);

    const handleLogout = () => {
        logout();
        setIsAuth(false);
    };

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <div className="app-wrapper">
            <header className="header">
                <div className="header-content">
                    <div className="header-title">
                        <h1>Платформа донорства крови</h1>
                        <p>Управление базой доноров</p>
                    </div>
                    <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button className="theme-toggle" onClick={toggleTheme} title="Сменить тему">
                            {theme === 'light' ? 'Темная тема' : 'Светлая тема'}
                        </button>
                        {isAuth && <Profile onLogout={handleLogout} />}
                    </div>
                </div>
            </header>

            {isAuth && (
                <nav className="tabs">
                    <button className={`tab ${page === 'donors' ? 'active' : ''}`} onClick={() => setPage('donors')}>
                        Доноры
                    </button>
                    <button className={`tab ${page === 'analytics' ? 'active' : ''}`} onClick={() => setPage('analytics')}>
                        Аналитика
                    </button>
                    <button className={`tab ${page === 'chat' ? 'active' : ''}`} onClick={() => setPage('chat')}>
                        Чат
                    </button>
                </nav>
            )}

            <main className="main-content">
                {!isAuth ? (
                    <LoginForm onLogin={() => setIsAuth(true)} />
                ) : (
                    <>
                        {page === 'donors' && <DonorList />}
                        {page === 'analytics' && <StatsPanel />}
                        {page === 'chat' && <Chat />}
                    </>
                )}
            </main>

            <footer className="footer">
                <div className="footer-content">
                    <p>© {new Date().getFullYear()} Платформа донорства крови</p>
                    <p>Разработал: <span className="author">Двораковский Д. А.</span></p>
                    <p>Почта: <a href="mailto:mryangest@gmail.com" className="email">mryangest@gmail.com</a></p>
                    <div className="tech-stack">
                        <span className="tech-badge">React</span>
                        <span className="tech-badge">Node.js</span>
                        <span className="tech-badge">PostgreSQL</span>
                        <span className="tech-badge">MongoDB</span>
                        <span className="tech-badge">Socket.IO</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default App;