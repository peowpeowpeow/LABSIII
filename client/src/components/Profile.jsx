import { useState, useEffect, useRef } from 'react';

const AVATAR_COLORS = ['#d32f2f', '#3498db', '#27ae60', '#f39c12', '#8e44ad', '#e67e22'];

function Profile({ onLogout }) {
    const [isOpen, setIsOpen] = useState(false);
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUserEmail(payload.email || 'Пользователь');
                setUserName(payload.name || payload.email.split('@')[0]);
            } catch (e) {
                setUserEmail('Пользователь');
                setUserName('Пользователь');
            }
        }
        
        const savedColor = localStorage.getItem('avatarColor');
        if (savedColor) setAvatarColor(savedColor);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleColorChange = (color) => {
        setAvatarColor(color);
        localStorage.setItem('avatarColor', color);
    };

    const initial = userName.charAt(0).toUpperCase();

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: avatarColor, color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', fontSize: '16px', border: '2px solid white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)', cursor: 'pointer'
                }}
                title="Профиль"
            >
                {initial}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute', top: '45px', right: '0',
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                    borderRadius: '12px', padding: '16px', width: '250px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 1000,
                    color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '12px'
                }}>
                    <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                        <div style={{ fontWeight: '600', fontSize: '16px' }}>{userName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{userEmail}</div>
                    </div>
                    
                    <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Цвет аватара</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {AVATAR_COLORS.map(color => (
                                <div 
                                    key={color}
                                    onClick={() => handleColorChange(color)}
                                    style={{
                                        width: '24px', height: '24px', borderRadius: '50%',
                                        background: color, cursor: 'pointer',
                                        border: avatarColor === color ? '2px solid var(--text-main)' : '2px solid transparent'
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={onLogout}
                        style={{
                            marginTop: '8px', background: '#fee2e2', color: '#b91c1c',
                            padding: '8px', border: 'none', borderRadius: '6px',
                            fontWeight: '600', cursor: 'pointer', width: '100%'
                        }}
                    >
                        Выйти
                    </button>
                </div>
            )}
        </div>
    );
}

export default Profile;