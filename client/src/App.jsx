import { useState, useEffect } from 'react';
import DonorList from './components/DonorList';
import LoginForm from './components/LoginForm';
import { logout } from './api';

function App() {
    const [isAuth, setIsAuth] = useState(() => !!localStorage.getItem('token'));

   
    useEffect(() => {
        const handler = () => setIsAuth(false);
        window.addEventListener('logout', handler);
        return () => window.removeEventListener('logout', handler);
    }, []);

    const handleLogout = () => {
        logout();
        setIsAuth(false);
    };

    return isAuth
        ? <DonorList onLogout={handleLogout} />
        : <LoginForm onLogin={() => setIsAuth(true)} />;
}

export default App;
