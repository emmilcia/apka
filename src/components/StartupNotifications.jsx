import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Bell, Calendar, Clock, X } from 'lucide-react';
import { format, addDays, isSameDay, parseISO, startOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';

export default function StartupNotifications() {
    const [isOpen, setIsOpen] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);

    const [tasks, setTasks] = useState([]);
    const [events, setEvents] = useState([]);
    const user = auth.currentUser;

    useEffect(() => {
        if (!user) return;

        const qTasks = query(collection(db, 'tasks'), where('userId', '==', user.uid));
        const unsubTasks = onSnapshot(qTasks, (snapshot) => {
            setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const qEvents = query(collection(db, 'events'), where('userId', '==', user.uid));
        const unsubEvents = onSnapshot(qEvents, (snapshot) => {
            setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubTasks();
            unsubEvents();
        };
    }, [user]);

    const upcomingTasks = (tasks || []).filter(t => {
        if (!t.deadline || t.status === 'done') return false;
        try {
            const deadline = new Date(t.deadline);
            const now = new Date();
            const diff = deadline.getTime() - now.getTime();
            return diff > 0 && diff < 48 * 60 * 60 * 1000; // Next 48h
        } catch (err) {
            return false;
        }
    });

    const tomorrowEvents = (events || []).filter(e => {
        try {
            const tomorrow = startOfDay(addDays(new Date(), 1));
            const eventStart = startOfDay(parseISO(e.startDate));
            return isSameDay(tomorrow, eventStart);
        } catch (err) {
            return false;
        }
    });

    useEffect(() => {
        if (!hasChecked && tasks.length > 0 && events.length > 0) {
            if (upcomingTasks.length > 0 || tomorrowEvents.length > 0) {
                setIsOpen(true);
            }
            setHasChecked(true);
        }
    }, [tasks, events, hasChecked, upcomingTasks.length, tomorrowEvents.length]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay notification-overlay">
            <div className="modal-content notification-modal">
                <div className="notification-header">
                    <div className="bell-icon">
                        <Bell className="animate-wiggle" size={32} />
                    </div>
                    <h2>Hej! Mamy kilka przypomnień 🐾</h2>
                    <button className="close-notif" onClick={() => setIsOpen(false)}><X /></button>
                </div>

                <div className="notification-body">
                    {upcomingTasks.length > 0 && (
                        <div className="notif-section">
                            <h3><Clock size={18} /> Nadchodzące terminy (48h)</h3>
                            <div className="notif-list">
                                {upcomingTasks.map(t => (
                                    <div key={t.id} className="notif-item">
                                        <span className="dot" style={{ background: t.priority === 'urgent' ? '#ef4444' : '#ff85b3' }}></span>
                                        <div className="notif-info">
                                            <strong>{t.title}</strong>
                                            <span>{format(new Date(t.deadline), 'EEEE, HH:mm', { locale: pl })}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tomorrowEvents.length > 0 && (
                        <div className="notif-section">
                            <h3><Calendar size={18} /> Jutrzejsze wydarzenia</h3>
                            <div className="notif-list">
                                {tomorrowEvents.map(e => (
                                    <div key={e.id} className="notif-item">
                                        <span className="dot" style={{ background: '#3b82f6' }}></span>
                                        <div className="notif-info">
                                            <strong>{e.title}</strong>
                                            <span>{e.startTime} - {e.endTime}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="notification-footer">
                    <button className="submit-btn" onClick={() => setIsOpen(false)}>Rozumiem, dziękuję! 🐾</button>
                </div>
            </div>
        </div>
    );
}
