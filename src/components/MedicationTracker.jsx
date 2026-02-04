import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    writeBatch
} from 'firebase/firestore';
import { Plus, Pill, Clock, Calendar as CalendarIcon, Trash2, PlusCircle, ChevronRight, ChevronLeft, CheckCircle2, Circle } from 'lucide-react';
import { format, addDays, startOfDay, isSameDay, eachDayOfInterval } from 'date-fns';
import { pl } from 'date-fns/locale';

const TIME_OF_DAY = [
    { id: 'morning', label: 'Rano', icon: '🌅' },
    { id: 'noon', label: 'Południe', icon: '☀️' },
    { id: 'evening', label: 'Wieczór', icon: '🌙' }
];

export default function MedicationTracker() {
    const [medications, setMedications] = useState([]);
    const [scheduledMeds, setScheduledMeds] = useState([]);
    const [takenMeds, setTakenMeds] = useState([]);

    const [isMedModalOpen, setIsMedModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

    const [newMed, setNewMed] = useState({
        name: '',
        dosage: '',
        unit: 'mg',
        description: ''
    });

    const [newSchedule, setNewSchedule] = useState({
        medId: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        timeOfDay: 'morning',
        frequency: 'daily', // 'daily', 'custom', 'weekly'
        customInterval: 2
    });

    const [startDate, setStartDate] = useState(new Date());
    const user = auth.currentUser;

    useEffect(() => {
        if (!user) return;

        // Listen for medications
        const medQuery = query(collection(db, 'medications'), where('userId', '==', user.uid));
        const unsubMeds = onSnapshot(medQuery, (snapshot) => {
            setMedications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (err) => console.error("Błąd leków:", err));

        // Listen for schedules
        const scheduleQuery = query(collection(db, 'scheduledMeds'), where('userId', '==', user.uid));
        const unsubSchedules = onSnapshot(scheduleQuery, (snapshot) => {
            setScheduledMeds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (err) => console.error("Błąd harmonogramu:", err));

        // Listen for taken logs
        const takenQuery = query(collection(db, 'takenMeds'), where('userId', '==', user.uid));
        const unsubTaken = onSnapshot(takenQuery, (snapshot) => {
            setTakenMeds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (err) => console.error("Błąd logów zażyć:", err));

        return () => {
            unsubMeds();
            unsubSchedules();
            unsubTaken();
        };
    }, [user]);

    const days = eachDayOfInterval({
        start: startDate,
        end: addDays(startDate, 6)
    });

    const addMedToInventory = async (e) => {
        e.preventDefault();
        if (!user) return;
        try {
            await addDoc(collection(db, 'medications'), {
                ...newMed,
                userId: user.uid,
                createdAt: new Date()
            });
            setIsMedModalOpen(false);
            setNewMed({ name: '', dosage: '', unit: 'mg', description: '' });
        } catch (err) {
            console.error("Błąd dodawania leku:", err);
        }
    };

    const deleteMedFromInventory = async (id) => {
        if (!user) return;
        try {
            const batch = writeBatch(db);

            // Delete med
            batch.delete(doc(db, 'medications', id));

            // Find and delete linked schedules
            const schedulesToDelete = scheduledMeds.filter(s => s.medId === id);
            for (const s of schedulesToDelete) {
                batch.delete(doc(db, 'scheduledMeds', s.id));
                // Find and delete taken logs for these schedules
                const logsToDelete = takenMeds.filter(t => t.scheduleId === s.id);
                for (const l of logsToDelete) {
                    batch.delete(doc(db, 'takenMeds', l.id));
                }
            }

            await batch.commit();
        } catch (err) {
            console.error("Błąd usuwania leku:", err);
        }
    };

    const addToSchedule = async (e) => {
        e.preventDefault();
        if (!newSchedule.medId || !user) return;
        try {
            await addDoc(collection(db, 'scheduledMeds'), {
                ...newSchedule,
                userId: user.uid,
                createdAt: new Date()
            });
            setIsScheduleModalOpen(false);
        } catch (err) {
            console.error("Błąd planowania:", err);
        }
    };

    const deleteFromSchedule = async (id) => {
        if (!user) return;
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, 'scheduledMeds', id));

            const logsToDelete = takenMeds.filter(t => t.scheduleId === id);
            for (const l of logsToDelete) {
                batch.delete(doc(db, 'takenMeds', l.id));
            }

            await batch.commit();
        } catch (err) {
            console.error("Błąd usuwania z harmonogramu:", err);
        }
    };

    const toggleTaken = async (day, scheduleId) => {
        if (!user) return;
        const dateKey = format(day, 'yyyy-MM-dd');
        const existing = takenMeds.find(t => t.dateKey === dateKey && t.scheduleId === scheduleId);

        try {
            if (existing) {
                await deleteDoc(doc(db, 'takenMeds', existing.id));
            } else {
                await addDoc(collection(db, 'takenMeds'), {
                    dateKey,
                    scheduleId,
                    userId: user.uid,
                    timestamp: new Date()
                });
            }
        } catch (err) {
            console.error("Błąd oznaczania jako zażyte:", err);
        }
    };

    const isMedTaken = (day, scheduleId) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        return takenMeds.some(t => t.dateKey === dateKey && t.scheduleId === scheduleId);
    };

    const getMedsForDay = (day, timeKey) => {
        return scheduledMeds.filter(s => {
            if (s.timeOfDay !== timeKey) return false;

            const scheduleStart = startOfDay(new Date(s.startDate));
            const currentDay = startOfDay(day);

            if (currentDay < scheduleStart) return false;

            const diffTime = currentDay.getTime() - scheduleStart.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (s.frequency === 'daily') return true;
            if (s.frequency === 'custom') return diffDays % s.customInterval === 0;
            if (s.frequency === 'weekly') return diffDays % 7 === 0;
            if (s.frequency === 'once') return diffDays === 0;

            return false;
        });
    };

    const getMedName = (id) => medications.find(m => m.id === id)?.name || 'Nieznany lek';
    const getMedDosage = (id) => medications.find(m => m.id === id)?.dosage || '';
    const getMedUnit = (id) => medications.find(m => m.id === id)?.unit || 'mg';

    return (
        <div className="meds-container">
            {/* Weekly Schedule Section */}
            <section className="weekly-schedule-section">
                <div className="section-header">
                    <div className="title-nav">
                        <h3>Harmonogram Tygodniowy</h3>
                        <div className="week-nav">
                            <button onClick={() => setStartDate(addDays(startDate, -7))}><ChevronLeft /></button>
                            <button onClick={() => setStartDate(new Date())}>Dzisiaj</button>
                            <button onClick={() => setStartDate(addDays(startDate, 7))}><ChevronRight /></button>
                        </div>
                    </div>
                    <button className="add-schedule-btn" onClick={() => setIsScheduleModalOpen(true)}>
                        <PlusCircle size={20} /> Zaplanuj zazycie
                    </button>
                </div>

                <div className="weekly-grid">
                    {days.map(day => (
                        <div key={day.toString()} className={`day-column ${isSameDay(day, new Date()) ? 'today' : ''}`}>
                            <div className="day-header">
                                <span className="day-name">{format(day, 'EEEE', { locale: pl })}</span>
                                <span className="day-date">{format(day, 'd MMM', { locale: pl })}</span>
                            </div>
                            <div className="day-slots">
                                {TIME_OF_DAY.map(slot => (
                                    <div key={slot.id} className="day-slot">
                                        <div className="slot-label">{slot.icon} {slot.label}</div>
                                        <div className="slot-items">
                                            {getMedsForDay(day, slot.id).map(s => {
                                                const taken = isMedTaken(day, s.id);
                                                return (
                                                    <div key={s.id} className={`scheduled-item-pill ${taken ? 'taken' : ''}`}>
                                                        <div className="pill-content" onClick={() => toggleTaken(day, s.id)}>
                                                            {taken ? <CheckCircle2 size={14} className="status-icon" /> : <Circle size={14} className="status-icon" />}
                                                            <div className="info">
                                                                <span className="name">{getMedName(s.medId)}</span>
                                                                <span className="dosage">{getMedDosage(s.medId)}{getMedUnit(s.medId)}</span>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => deleteFromSchedule(s.id)} className="remove-s">×</button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Inventory Section */}
            <section className="inventory-section">
                <div className="section-header">
                    <h3>Moje Leki (Apteczka)</h3>
                    <button className="add-med-btn" onClick={() => setIsMedModalOpen(true)}>
                        <Plus size={20} /> Dodaj do apteczki
                    </button>
                </div>
                <div className="med-tiles">
                    {medications.map(med => (
                        <div key={med.id} className="med-tile">
                            <div className="tile-header">
                                <div className="med-icon">
                                    <Pill size={24} />
                                </div>
                                <button onClick={() => deleteMedFromInventory(med.id)} className="delete-med">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="tile-body">
                                <h4>{med.name}</h4>
                                <p className="dosage">{med.dosage} {med.unit}</p>
                                <p className="desc">{med.description}</p>
                            </div>
                        </div>
                    ))}
                    {medications.length === 0 && (
                        <div className="empty-inventory">
                            Twoja apteczka jest pusta. Dodaj leki, które przyjmujesz.
                        </div>
                    )}
                </div>
            </section>

            {/* Modal: Add to Inventory */}
            {isMedModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Dodaj nowy lek do apteczki</h2>
                        <form onSubmit={addMedToInventory}>
                            <input
                                type="text"
                                placeholder="Nazwa leku (np. Apap)"
                                value={newMed.name}
                                onChange={e => setNewMed({ ...newMed, name: e.target.value })}
                                required
                            />
                            <div className="dosage-input-group">
                                <input
                                    type="text"
                                    placeholder="Ilość (np. 500)"
                                    value={newMed.dosage}
                                    onChange={e => setNewMed({ ...newMed, dosage: e.target.value })}
                                    required
                                />
                                <select
                                    value={newMed.unit}
                                    onChange={e => setNewMed({ ...newMed, unit: e.target.value })}
                                >
                                    <option value="mg">mg</option>
                                    <option value="ml">ml</option>
                                </select>
                            </div>
                            <textarea
                                placeholder="Dodatkowe informacje (np. po jedzeniu)"
                                value={newMed.description}
                                onChange={e => setNewMed({ ...newMed, description: e.target.value })}
                            />
                            <div className="modal-actions">
                                <button type="button" onClick={() => setIsMedModalOpen(false)}>Anuluj</button>
                                <button type="submit" className="submit-btn">Dodaj</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Add to Schedule */}
            {isScheduleModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Zaplanuj przyjmowanie leku</h2>
                        <form onSubmit={addToSchedule}>
                            <div className="form-group">
                                <label>Wybierz lek z apteczki:</label>
                                <select
                                    value={newSchedule.medId}
                                    onChange={e => setNewSchedule({ ...newSchedule, medId: e.target.value })}
                                    required
                                >
                                    <option value="">-- Wybierz lek --</option>
                                    {medications.map(m => (
                                        <option key={m.id} value={m.id}>{m.name} ({m.dosage}{m.unit})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Początek przyjmowania:</label>
                                <input
                                    type="date"
                                    value={newSchedule.startDate}
                                    onChange={e => setNewSchedule({ ...newSchedule, startDate: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Pora dnia:</label>
                                <select
                                    value={newSchedule.timeOfDay}
                                    onChange={e => setNewSchedule({ ...newSchedule, timeOfDay: e.target.value })}
                                >
                                    {TIME_OF_DAY.map(t => (
                                        <option key={t.id} value={t.id}>{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Częstotliwość:</label>
                                <div className="frequency-group">
                                    <select
                                        value={newSchedule.frequency}
                                        onChange={e => setNewSchedule({ ...newSchedule, frequency: e.target.value })}
                                    >
                                        <option value="once">Jednorazowo</option>
                                        <option value="daily">Codziennie</option>
                                        <option value="custom">Co kilka dni...</option>
                                        <option value="weekly">Co tydzień</option>
                                    </select>
                                    {newSchedule.frequency === 'custom' && (
                                        <div className="custom-freq-input">
                                            <span>Co</span>
                                            <input
                                                type="number"
                                                min="1"
                                                value={newSchedule.customInterval}
                                                onChange={e => setNewSchedule({ ...newSchedule, customInterval: parseInt(e.target.value) || 1 })}
                                            />
                                            <span>dni</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={() => setIsScheduleModalOpen(false)}>Anuluj</button>
                                <button type="submit" className="submit-btn" disabled={medications.length === 0}>
                                    {medications.length === 0 ? 'Najpierw dodaj lek do apteczki' : 'Zaplanuj'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
