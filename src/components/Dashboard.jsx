import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import {
    LayoutDashboard,
    CheckCircle2,
    Pill,
    Wallet as WalletIcon,
    TrendingUp,
    ArrowRight,
    PlusCircle,
    Calendar as CalendarIcon,
    AlertCircle
} from 'lucide-react';
import { format, startOfDay, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import WeatherWidget from './WeatherWidget';

export default function Dashboard({ setActiveTab }) {
    const [tasks, setTasks] = useState([]);
    const [meds, setMeds] = useState({ items: [], session: '', isNextDay: false });
    const [medList, setMedList] = useState([]);
    const [walletSummary, setWalletSummary] = useState({ total: 0, lastTransactions: [] });
    const user = auth.currentUser;

    useEffect(() => {
        if (!user) return;

        // Fetch Med List for name resolution
        const qMedList = query(collection(db, 'medications'), where('userId', '==', user.uid));
        const unsubMedList = onSnapshot(qMedList, (snapshot) => {
            setMedList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Fetch tasks and filter by 48h deadline
        const qTasks = query(
            collection(db, 'tasks'),
            where('userId', '==', user.uid),
            where('status', '==', 'todo')
        );
        const unsubTasks = onSnapshot(qTasks, (snapshot) => {
            const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const now = new Date();
            const fortyEightHours = 48 * 60 * 60 * 1000;

            const relevantTasks = allTasks.filter(t => {
                const deadline = t.deadline ? new Date(t.deadline) : null;
                if (!deadline) return false;
                const diff = deadline.getTime() - now.getTime();
                return diff <= fortyEightHours && diff > 0;
            }).slice(0, 5);

            setTasks(relevantTasks);
        });

        // Fetch Meds and determine next session
        const qMeds = query(
            collection(db, 'scheduledMeds'),
            where('userId', '==', user.uid)
        );
        const unsubMeds = onSnapshot(qMeds, (snapshot) => {
            const allSchedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const now = new Date();
            const hour = now.getHours();

            let targetSession = 'morning';
            let targetDay = now;

            if (hour < 10) {
                targetSession = 'morning';
            } else if (hour < 14) {
                targetSession = 'noon';
            } else if (hour < 20) {
                targetSession = 'evening';
            } else {
                targetSession = 'morning';
                targetDay = addDays(now, 1);
            }

            const filtered = allSchedules.filter(s => {
                if (s.timeOfDay !== targetSession) return false;
                const scheduleStart = startOfDay(new Date(s.startDate));
                const currentDay = startOfDay(targetDay);
                if (currentDay < scheduleStart) return false;
                const diffDays = Math.round((currentDay.getTime() - scheduleStart.getTime()) / (1000 * 60 * 60 * 24));

                if (s.frequency === 'daily') return true;
                if (s.frequency === 'custom') return diffDays % s.customInterval === 0;
                if (s.frequency === 'weekly') return diffDays % 7 === 0;
                if (s.frequency === 'once') return diffDays === 0;
                if (s.frequency === 'for_days') return diffDays >= 0 && diffDays < (s.duration || 7);
                return false;
            });

            setMeds({
                items: filtered,
                session: targetSession,
                isNextDay: targetDay > now
            });
        });

        // Fetch Wallet status
        const qWallet = query(
            collection(db, 'transactions'),
            where('userId', '==', user.uid),
            limit(5)
        );
        const unsubWallet = onSnapshot(qWallet, (snapshot) => {
            const trans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const total = trans.reduce((acc, t) => acc + (t.category === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount)), 0);
            setWalletSummary({ total, lastTransactions: trans });
        });

        return () => {
            unsubMedList();
            unsubTasks();
            unsubMeds();
            unsubWallet();
        };
    }, [user]);

    const getMedName = (id) => medList.find(m => m.id === id)?.name || 'Lek';

    const getSessionLabel = (session, isNextDay) => {
        const labels = { morning: 'Rano', noon: 'W południe', evening: 'Wieczorem' };
        return `${isNextDay ? 'Jutro' : 'Dziś'} ${labels[session]}`;
    };

    return (
        <div className="dashboard-container animate-fadeIn">
            <header className="dashboard-header">
                <div className="welcome-text">
                    <h1>Witaj ponownie! 👋</h1>
                    <p>Oto Twój magiczny plan na dziś.</p>
                </div>
                <WeatherWidget />
            </header>

            <div className="dashboard-grid full-width-dash">
                {/* Tasks Summary */}
                <div className="dash-card tasks-summary" onClick={() => setActiveTab('todo')}>
                    <div className="card-header">
                        <CheckCircle2 className="card-icon" />
                        <h3>Zadania (48h)</h3>
                        <ArrowRight size={18} className="arrow" />
                    </div>
                    <div className="card-content">
                        {tasks.length > 0 ? (
                            <ul className="dash-list">
                                {tasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).map(t => (
                                    <li key={t.id} className={`dash-list-item priority-${t.priority}`}>
                                        <div className="dot"></div>
                                        <div className="title-box">
                                            <span className="title">{t.title}</span>
                                            <span className="deadline-mini">{format(new Date(t.deadline), 'HH:mm, dd.MM')}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="empty-msg">Brak pilnych zadań. 🎉</p>
                        )}
                    </div>
                </div>

                {/* Meds Summary */}
                <div className="dash-card meds-summary" onClick={() => setActiveTab('meds')}>
                    <div className="card-header">
                        <Pill className="card-icon" />
                        <h3>Najbliższe leki ({meds.session && getSessionLabel(meds.session, meds.isNextDay)})</h3>
                        <ArrowRight size={18} className="arrow" />
                    </div>
                    <div className="card-content">
                        {meds.items?.length > 0 ? (
                            <ul className="dash-list">
                                {meds.items.map(m => (
                                    <li key={m.id} className="dash-list-item">
                                        <span className="dot"></span>
                                        <span className="title">{getMedName(m.medId)}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="empty-msg">Brak leków w tej sesji.</p>
                        )}
                    </div>
                </div>

                {/* Wallet Mini-Chart/Summary */}
                <div className="dash-card wallet-summary-card" onClick={() => setActiveTab('wallet')}>
                    <div className="card-header">
                        <WalletIcon className="card-icon" />
                        <h3>Stan portfela</h3>
                        <ArrowRight size={18} className="arrow" />
                    </div>
                    <div className="card-content">
                        <div className="mini-balance">
                            <span className="label">Saldo całkowite</span>
                            <span className="amount">{walletSummary.total.toFixed(2)} zł</span>
                        </div>
                        {walletSummary.lastTransactions.length > 0 && (
                            <div className="trend-indicator green">
                                <TrendingUp size={14} /> Śledzisz swoje finanse na bieżąco
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
