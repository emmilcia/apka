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
    doc
} from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Edit2 } from 'lucide-react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addDays,
    eachDayOfInterval,
    isWithinInterval,
    parseISO,
    startOfDay,
    endOfDay
} from 'date-fns';
import { pl } from 'date-fns/locale';

const CATEGORIES = {
    school: { label: 'Szkoła', color: '#3b82f6' }, // deeper blue
    entertainment: { label: 'Rozrywka', color: '#eab308' }, // deeper yellow/gold
    duties: { label: 'Obowiązki', color: '#f97316' }, // deeper orange
    holiday: { label: 'Święto', color: 'var(--secondary-color)' } // theme secondary
};

const POLISH_HOLIDAYS = {
    '01-01': 'Nowy Rok',
    '01-06': 'Trzech Króli',
    '05-01': 'Święto Pracy',
    '05-03': 'Święto Konstytucji 3 Maja',
    '08-15': 'Wniebowzięcie NMP',
    '11-01': 'Wszystkich Świętych',
    '11-11': 'Święto Niepodległości',
    '12-25': 'Boże Narodzenie (Dzień 1)',
    '12-26': 'Boże Narodzenie (Dzień 2)'
};

export default function Calendar() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEventId, setEditingEventId] = useState(null);
    const [newEvent, setNewEvent] = useState({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        category: 'school'
    });

    const user = auth.currentUser;

    useEffect(() => {
        if (!user) return;

        const q = query(collection(db, 'events'), where('userId', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const eventList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setEvents(eventList);
        }, (error) => {
            console.error("Błąd ładowania wydarzeń:", error);
        });

        return () => unsubscribe();
    }, [user]);

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const onDateClick = (day) => {
        setSelectedDate(day);
        if (!editingEventId) {
            setNewEvent({
                ...newEvent,
                startDate: format(day, 'yyyy-MM-dd'),
                endDate: format(day, 'yyyy-MM-dd')
            });
        }
    };

    const handleAddOrEditEvent = async (e) => {
        e.preventDefault();
        if (!user) return;

        try {
            if (editingEventId) {
                const eventRef = doc(db, 'events', editingEventId);
                await updateDoc(eventRef, newEvent);
            } else {
                await addDoc(collection(db, 'events'), {
                    ...newEvent,
                    userId: user.uid,
                    createdAt: new Date()
                });
            }
            closeModal();
        } catch (err) {
            console.error("Błąd zapisu wydarzenia:", err);
            alert("Nie udało się zapisać wydarzenia.");
        }
    };

    const deleteEvent = async (id) => {
        try {
            await deleteDoc(doc(db, 'events', id));
        } catch (err) {
            console.error("Błąd usuwania wydarzenia:", err);
        }
    };

    const startEditing = (event) => {
        setEditingEventId(event.id);
        setNewEvent({
            title: event.title,
            description: event.description,
            startTime: event.startTime,
            endTime: event.endTime,
            startDate: event.startDate,
            endDate: event.endDate,
            category: event.category
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingEventId(null);
        setNewEvent({
            title: '',
            description: '',
            startTime: '',
            endTime: '',
            startDate: format(selectedDate, 'yyyy-MM-dd'),
            endDate: format(selectedDate, 'yyyy-MM-dd'),
            category: 'school'
        });
    };

    const isEventOnDay = (event, day) => {
        const start = startOfDay(parseISO(event.startDate));
        const end = endOfDay(parseISO(event.endDate));
        const current = startOfDay(day);
        return isWithinInterval(current, { start, end });
    };

    const renderHeader = () => {
        return (
            <div className="calendar-header">
                <button onClick={prevMonth}><ChevronLeft /></button>
                <h2>{format(currentMonth, 'LLLL yyyy', { locale: pl })}</h2>
                <button onClick={nextMonth}><ChevronRight /></button>
            </div>
        );
    };

    const renderDays = () => {
        const days = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Niedz'];
        return (
            <div className="calendar-days-header">
                {days.map(d => <div key={d}>{d}</div>)}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const rows = [];
        let days = [];
        const calendarInterval = eachDayOfInterval({ start: startDate, end: endDate });

        // Ensure we always have exactly 42 days (6 full weeks) to fill the grid
        while (calendarInterval.length < 42) {
            const lastDay = calendarInterval[calendarInterval.length - 1];
            calendarInterval.push(addDays(lastDay, 1));
        }

        calendarInterval.forEach((day, i) => {
            const formattedDate = format(day, 'd');
            const dayKey = format(day, 'MM-dd');
            const holidayName = POLISH_HOLIDAYS[dayKey];
            const dayEvents = events.filter(e => isEventOnDay(e, day));

            days.push(
                <div
                    key={day.toString()}
                    className={`calendar-cell ${!isSameMonth(day, monthStart) ? 'disabled' : ''} ${isSameDay(day, selectedDate) ? 'selected' : ''} ${holidayName ? 'holiday-cell' : ''}`}
                    onClick={() => onDateClick(day)}
                >
                    <span className="number">{formattedDate}</span>
                    <div className="cell-events">
                        {holidayName && (
                            <div className="event-pill holiday-pill" title={holidayName}>
                                {holidayName}
                            </div>
                        )}
                        {dayEvents.map(ev => (
                            <div
                                key={ev.id}
                                className="event-pill"
                                style={{ backgroundColor: CATEGORIES[ev.category]?.color }}
                                title={ev.description}
                            >
                                {ev.startTime} {ev.title}
                            </div>
                        ))}
                    </div>
                </div>
            );

            if ((i + 1) % 7 === 0) {
                rows.push(<div className="calendar-row" key={day.toString()}>{days}</div>);
                days = [];
            }
        });

        return <div className="calendar-body">{rows}</div>;
    };

    return (
        <div className="calendar-container">
            <div className="calendar-main">
                {renderHeader()}
                {renderDays()}
                {renderCells()}
            </div>

            <div className="calendar-sidebar">
                <div className="sidebar-header">
                    <h3>Wydarzenia {format(selectedDate, 'd MMMM', { locale: pl })}</h3>
                    <button className="add-event-btn" onClick={() => setIsModalOpen(true)}>
                        <Plus size={20} />
                    </button>
                </div>
                <div className="selected-day-events">
                    {(() => {
                        const selectedDayKey = format(selectedDate, 'MM-dd');
                        const holiday = POLISH_HOLIDAYS[selectedDayKey];
                        return holiday ? (
                            <div className="event-card holiday-card">
                                <h4>{holiday}</h4>
                                <p className="category-label">Święto Państwowe</p>
                                <p className="desc">Dzień ustawowo wolny od pracy.</p>
                            </div>
                        ) : null;
                    })()}
                    {events.filter(e => isEventOnDay(e, selectedDate)).map(ev => (
                        <div key={ev.id} className="event-card" style={{ borderLeftColor: CATEGORIES[ev.category]?.color }}>
                            <div className="event-card-header">
                                <h4>{ev.title}</h4>
                                <div className="event-card-actions">
                                    <button onClick={() => startEditing(ev)} className="edit-btn"><Edit2 size={16} /></button>
                                    <button onClick={() => deleteEvent(ev.id)} className="delete-btn"><Trash2 size={16} /></button>
                                </div>
                            </div>
                            <p className="category-label">{CATEGORIES[ev.category]?.label}</p>
                            <p className="time">{ev.startTime} - {ev.endTime}</p>
                            {ev.startDate !== ev.endDate && (
                                <p className="duration">{ev.startDate} do {ev.endDate}</p>
                            )}
                            <p className="desc">{ev.description}</p>
                        </div>
                    ))}
                    {events.filter(e => isEventOnDay(e, selectedDate)).length === 0 && (
                        <p className="empty-msg">Brak wydarzeń na ten dzień.</p>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{editingEventId ? 'Edytuj wydarzenie' : 'Nowe wydarzenie'}</h2>
                        </div>
                        <form onSubmit={handleAddOrEditEvent}>
                            <div className="form-group">
                                <label>Nazwa wydarzenia:</label>
                                <input
                                    type="text"
                                    placeholder="Wpisz nazwę..."
                                    value={newEvent.title}
                                    onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Kategoria:</label>
                                <select
                                    value={newEvent.category}
                                    onChange={e => setNewEvent({ ...newEvent, category: e.target.value })}
                                >
                                    <option value="school">Szkoła</option>
                                    <option value="entertainment">Rozrywka</option>
                                    <option value="duties">Obowiązki</option>
                                </select>
                            </div>

                            <div className="date-inputs">
                                <div className="form-group">
                                    <label>Od:</label>
                                    <input
                                        type="date"
                                        value={newEvent.startDate}
                                        onChange={e => setNewEvent({ ...newEvent, startDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Do:</label>
                                    <input
                                        type="date"
                                        value={newEvent.endDate}
                                        onChange={e => setNewEvent({ ...newEvent, endDate: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="time-inputs">
                                <div className="form-group">
                                    <label>Początek:</label>
                                    <input
                                        type="time"
                                        value={newEvent.startTime}
                                        onChange={e => setNewEvent({ ...newEvent, startTime: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Koniec:</label>
                                    <input
                                        type="time"
                                        value={newEvent.endTime}
                                        onChange={e => setNewEvent({ ...newEvent, endTime: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Opis:</label>
                                <textarea
                                    placeholder="Dodaj opis wydarzenia..."
                                    value={newEvent.description}
                                    onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={closeModal}>Anuluj</button>
                                <button type="submit" className="submit-btn">{editingEventId ? 'Zapisz zmiany' : 'Dodaj wydarzenie'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
