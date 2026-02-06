import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Bell, Calendar, Clock, X, Pill } from 'lucide-react';
import { format, addDays, isSameDay, parseISO, startOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';

const TIME_OF_DAY = [
    { id: 'morning', label: 'Rano' },
    { id: 'noon', label: 'Południe' },
    { id: 'evening', label: 'Wieczór' }
];

export default function StartupNotifications() {
    const [isOpen, setIsOpen] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);

    const [tasks, setTasks] = useState([]);
    const [events, setEvents] = useState([]);

    // Meds state
    const [medications, setMedications] = useState([]);
    const [scheduledMeds, setScheduledMeds] = useState([]);
    const [takenMeds, setTakenMeds] = useState([]);

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

        // Meds listeners
        const medQuery = query(collection(db, 'medications'), where('userId', '==', user.uid));
        const unsubMeds = onSnapshot(medQuery, (snapshot) => {
            setMedications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const scheduleQuery = query(collection(db, 'scheduledMeds'), where('userId', '==', user.uid));
        const unsubSchedules = onSnapshot(scheduleQuery, (snapshot) => {
            setScheduledMeds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const takenQuery = query(collection(db, 'takenMeds'), where('userId', '==', user.uid));
        const unsubTaken = onSnapshot(takenQuery, (snapshot) => {
            setTakenMeds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubTasks();
            unsubEvents();
            unsubMeds();
            unsubSchedules();
            unsubTaken();
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

    const todayEvents = (events || []).filter(e => {
        try {
            const today = startOfDay(new Date());
            const eventStart = startOfDay(parseISO(e.startDate));
            return isSameDay(today, eventStart);
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

    // Calculate meds for today
    const medsToday = scheduledMeds.flatMap(s => {
        const today = new Date();
        const scheduleStart = startOfDay(new Date(s.startDate));
        const currentDay = startOfDay(today);

        if (currentDay < scheduleStart) return [];

        const diffTime = currentDay.getTime() - scheduleStart.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        let shouldTake = false;
        if (s.frequency === 'daily') shouldTake = true;
        else if (s.frequency === 'custom') shouldTake = diffDays % s.customInterval === 0;
        else if (s.frequency === 'weekly') shouldTake = diffDays % 7 === 0;
        else if (s.frequency === 'once') shouldTake = diffDays === 0;
        else if (s.frequency === 'for_days') shouldTake = diffDays >= 0 && diffDays < (s.duration || 7);

        if (!shouldTake) return [];

        // Check if taken
        const dateKey = format(today, 'yyyy-MM-dd');
        const isTaken = takenMeds.some(t => t.dateKey === dateKey && t.scheduleId === s.id);

        if (isTaken) return [];

        const medDetails = medications.find(m => m.id === s.medId);
        if (!medDetails) return [];

        return [{
            ...medDetails,
            scheduleId: s.id,
            timeOfDay: s.timeOfDay
        }];
    }).sort((a, b) => {
        const order = { 'morning': 1, 'noon': 2, 'evening': 3 };
        return (order[a.timeOfDay] || 99) - (order[b.timeOfDay] || 99);
    });

    useEffect(() => {
        if (!hasChecked && tasks.length > 0 && (events.length > 0 || scheduledMeds.length > 0)) {
            if (upcomingTasks.length > 0 || todayEvents.length > 0 || tomorrowEvents.length > 0 || medsToday.length > 0) {
                setIsOpen(true);
            }
            setHasChecked(true);
        }
    }, [tasks, events, scheduledMeds, hasChecked, upcomingTasks.length, todayEvents.length, tomorrowEvents.length, medsToday.length]);

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
                    {todayEvents.length > 0 && (
                        <div className="notif-section">
                            <h3><Calendar size={18} /> Dzisiejsze wydarzenia</h3>
                            <div className="notif-list">
                                {todayEvents.map(e => (
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

                    {upcomingTasks.length > 0 && (
                        <div className="notif-section">
                            <h3><Clock size={18} /> Nadchodzące terminy (48h)</h3>
                            <div className="notif-list">
                                {upcomingTasks.map(t => (
                                    <div key={t.id} className="notif-item">
                                        <span className="dot" style={{ background: t.priority === 'urgent' ? '#ef4444' : 'var(--secondary-color)' }}></span>
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

                    {medsToday.length > 0 && (
                        <div className="notif-section">
                            <h3><Pill size={18} /> Leki na dziś (do wzięcia)</h3>
                            <div className="notif-list">
                                {medsToday.map(m => (
                                    <div key={`${m.scheduleId}-${m.timeOfDay}`} className="notif-item">
                                        <span className="dot" style={{ background: 'var(--primary-color)' }}></span>
                                        <div className="notif-info">
                                            <strong>{m.name}</strong>
                                            <span>
                                                {TIME_OF_DAY.find(t => t.id === m.timeOfDay)?.label || m.timeOfDay}
                                                {' • '} {m.dosage}{m.unit}
                                            </span>
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
