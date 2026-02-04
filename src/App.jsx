import { useState, useEffect } from 'react'
import { auth } from './firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import TodoList from './components/TodoList.jsx'
import Calendar from './components/Calendar.jsx'
import MedicationTracker from './components/MedicationTracker.jsx'
import StartupNotifications from './components/StartupNotifications.jsx'
import Auth from './components/Auth.jsx'
import { LogOut, User, Sparkles, Palette } from 'lucide-react'
import './index.css'

function App() {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('todo')
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'pink');

    useEffect(() => {
        document.body.className = theme === 'blue' ? 'blue-theme' : '';
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
    const toggleTheme = () => setTheme(prev => prev === 'pink' ? 'blue' : 'pink');

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
                    <button
                        onClick={toggleTheme}
                        className="theme-toggle-btn"
                        title={theme === 'pink' ? "Zmień na niebieski" : "Zmień na różowy"}
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
                    <Sparkles className="nav-icon" style={{ transform: 'scaleX(-1)' }} />
                </nav>
            </header>
            <main className="app-main">
                {activeTab === 'calendar' && <Calendar />}
                {activeTab === 'todo' && <TodoList />}
                {activeTab === 'meds' && <MedicationTracker />}
            </main>

            <footer className="elegant-footer">
                <p>Made with {theme === 'pink' ? '💖' : '💙'} by Emilia Dudzik</p>
            </footer>
        </div>
    )
}

export default App
