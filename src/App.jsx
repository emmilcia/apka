import { useState, useEffect } from 'react'
import { auth } from './firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import TodoList from './components/TodoList.jsx'
import Calendar from './components/Calendar.jsx'
import MedicationTracker from './components/MedicationTracker.jsx'
import StartupNotifications from './components/StartupNotifications.jsx'
import Auth from './components/Auth.jsx'
import { LogOut, User } from 'lucide-react'
import './index.css'

function App() {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('todo')

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
            {/* Decorative Elements */}
            <div className="petals-container">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="petal" style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 10}s`,
                        animationDuration: `${10 + Math.random() * 20}s`
                    }}>🌸</div>
                ))}
            </div>

            <header className="app-header">
                <div className="user-profile">
                    <div className="user-info">
                        <User size={16} />
                        <span>{user.email}</span>
                    </div>
                    <button onClick={handleLogout} className="logout-btn" title="Wyloguj">
                        <LogOut size={18} />
                    </button>
                </div>
                <nav className="app-nav">
                    <img src="/paw.png" className="nav-paw" alt="" />
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
                    <img src="/paw.png" className="nav-paw" alt="" style={{ transform: 'scaleX(-1)' }} />
                </nav>
            </header>
            <main className="app-main">
                {activeTab === 'calendar' && <Calendar />}
                {activeTab === 'todo' && <TodoList />}
                {activeTab === 'meds' && <MedicationTracker />}
            </main>

            <footer className="elegant-footer">
                <p>Made with 💖 by Emilia Dudzik</p>
            </footer>
        </div>
    )
}

export default App
