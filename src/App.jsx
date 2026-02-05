import { useState, useEffect, useRef } from 'react'
import { auth } from './firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import TodoList from './components/TodoList.jsx'
import Calendar from './components/Calendar.jsx'
import MedicationTracker from './components/MedicationTracker.jsx'
import Notes from './components/Notes.jsx'
import StartupNotifications from './components/StartupNotifications.jsx'
import Auth from './components/Auth.jsx'
import { LogOut, User, Sparkles, Palette } from 'lucide-react'
import './index.css'

function App() {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('todo')
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'pink');
    const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
    const themeMenuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (themeMenuRef.current && !themeMenuRef.current.contains(event.target)) {
                setIsThemeMenuOpen(false);
            }
        };

        if (isThemeMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isThemeMenuOpen]);

    useEffect(() => {
        // Remove all possible theme classes
        const themeClasses = ['blue-theme', 'light-pink-theme', 'purple-theme'];
        document.body.classList.remove(...themeClasses);

        // Add current theme class (if not default pink)
        if (theme !== 'pink') {
            document.body.classList.add(`${theme}-theme`);
        }

        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        console.log("Inicjalizacja nasłuchiwania Auth...");
        const timeout = setTimeout(() => {
            if (authLoading) {
                console.warn("Auth timeout: Sprawdź połączenie z Firebase.");
                setAuthLoading(false);
            }
        }, 5000);

        try {
            const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
                console.log("Stan Auth zmieniony:", currentUser ? "Zalogowany" : "Wylogowany");
                setUser(currentUser);
                setAuthLoading(false);
                clearTimeout(timeout);
            }, (error) => {
                console.error("Błąd Auth listenera:", error);
                setAuthLoading(false);
                clearTimeout(timeout);
            });
            return () => unsubscribe();
        } catch (err) {
            console.error("Błąd podczas onAuthStateChanged:", err);
            setAuthLoading(false);
            clearTimeout(timeout);
        }
    }, [authLoading]);

    const handleLogout = () => signOut(auth);

    const themes = [
        { id: 'pink', label: 'Różowy (Kotki)', color: '#ff4d94' },
        { id: 'blue', label: 'Niebieski (Auta)', color: '#3b82f6' },
        { id: 'light-pink', label: 'Jasny Róż (Króliki)', color: '#ff80b3' },
        { id: 'purple', label: 'Fioletowy (Kokardki)', color: '#a855f7' }
    ];

    if (authLoading) {
        return (
            <div className="loading-screen">
                <div className="loader large">🐾</div>
                <p>Ładowanie Twojego magicznego świata...</p>
            </div>
        );
    }

    if (!user) {
        return <Auth />;
    }

    return (
        <div className="app-container">
            <StartupNotifications />


            <header className="app-header">
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="theme-menu-container" ref={themeMenuRef}>
                        <button
                            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                            className={`theme-toggle-btn ${isThemeMenuOpen ? 'active' : ''}`}
                            title="Zmień motyw"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '50%',
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--primary-color)',
                                cursor: 'pointer',
                                transition: 'all 0.3s'
                            }}
                        >
                            <Palette size={20} />
                        </button>

                        {isThemeMenuOpen && (
                            <div className="theme-options">
                                {themes.map(t => (
                                    <button
                                        key={t.id}
                                        className={`theme-item ${theme === t.id ? 'active' : ''}`}
                                        onClick={() => {
                                            setTheme(t.id);
                                            setIsThemeMenuOpen(false);
                                        }}
                                    >
                                        <div
                                            className="theme-dot"
                                            style={{ background: t.color }}
                                        />
                                        <span>{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="user-profile">
                        <div className="user-info">
                            <User size={16} />
                            <span>{user.email}</span>
                        </div>
                        <button onClick={handleLogout} className="logout-btn" title="Wyloguj">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>

                <nav className="app-nav">
                    <Sparkles className="nav-icon" />
                    <div className="nav-links">
                        <button
                            className={activeTab === 'calendar' ? 'active' : ''}
                            onClick={() => setActiveTab('calendar')}
                        >
                            <span>Kalendarz</span>
                        </button>
                        <button
                            className={activeTab === 'todo' ? 'active' : ''}
                            onClick={() => setActiveTab('todo')}
                        >
                            <span>Lista zadań</span>
                        </button>
                        <button
                            className={activeTab === 'meds' ? 'active' : ''}
                            onClick={() => setActiveTab('meds')}
                        >
                            <span>Leki</span>
                        </button>
                        <button
                            className={activeTab === 'notes' ? 'active' : ''}
                            onClick={() => setActiveTab('notes')}
                        >
                            <span>Notatki</span>
                        </button>
                    </div>
                    <Sparkles className="nav-icon" style={{ transform: 'scaleX(-1)' }} />
                </nav>
            </header>
            <main className="app-main">
                <div className={`tab-pane ${activeTab === 'calendar' ? 'active' : ''}`}><Calendar /></div>
                <div className={`tab-pane ${activeTab === 'todo' ? 'active' : ''}`}><TodoList /></div>
                <div className={`tab-pane ${activeTab === 'meds' ? 'active' : ''}`}><MedicationTracker /></div>
                <div className={`tab-pane ${activeTab === 'notes' ? 'active' : ''}`}><Notes /></div>
            </main>

            <footer className="elegant-footer">
                <p>Made with {theme === 'pink' ? '💖' : '💙'} by Emilia Dudzik</p>
            </footer>
        </div>
    )
}

export default App
