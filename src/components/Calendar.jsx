import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
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
    eachDayOfInterval
} from 'date-fns';
import { pl } from 'date-fns/locale';

export default function Calendar() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newEvent, setNewEvent] = useState({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        date: format(new Date(), 'yyyy-MM-dd')
    });

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const onDateClick = (day) => {
        setSelectedDate(day);
        setNewEvent({ ...newEvent, date: format(day, 'yyyy-MM-dd') });
    };

    const addEvent = (e) => {
        e.preventDefault();
        setEvents([...events, { ...newEvent, id: Date.now() }]);
        setIsModalOpen(false);
        setNewEvent({ title: '', description: '', startTime: '', endTime: '', date: format(selectedDate, 'yyyy-MM-dd') });
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
        const days = ['Niedz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
        return (
            <div className="calendar-days-header">
                {days.map(d => <div key={d}>{d}</div>)}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const rows = [];
        let days = [];
        let day = startDate;

        const calendarInterval = eachDayOfInterval({ start: startDate, end: endDate });

        calendarInterval.forEach((day, i) => {
            const formattedDate = format(day, 'd');
            const dayEvents = events.filter(e => e.date === format(day, 'yyyy-MM-dd'));

            days.push(
                <div
                    key={day.toString()}
                    className={`calendar-cell ${!isSameMonth(day, monthStart) ? 'disabled' : ''} ${isSameDay(day, selectedDate) ? 'selected' : ''}`}
                    onClick={() => onDateClick(day)}
                >
                    <span className="number">{formattedDate}</span>
                    <div className="cell-events">
                        {dayEvents.map(ev => (
                            <div key={ev.id} className="event-pill" title={ev.description}>
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
                    {events.filter(e => e.date === format(selectedDate, 'yyyy-MM-dd')).map(ev => (
                        <div key={ev.id} className="event-card">
                            <h4>{ev.title}</h4>
                            <p className="time">{ev.startTime} - {ev.endTime}</p>
                            <p className="desc">{ev.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Nowe wydarzenie</h2>
                            <button onClick={() => setIsModalOpen(false)}><X /></button>
                        </div>
                        <form onSubmit={addEvent}>
                            <input
                                type="text"
                                placeholder="Nazwa wydarzenia"
                                value={newEvent.title}
                                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                required
                            />
                            <div className="time-inputs">
                                <input
                                    type="time"
                                    value={newEvent.startTime}
                                    onChange={e => setNewEvent({ ...newEvent, startTime: e.target.value })}
                                    required
                                />
                                <span>do</span>
                                <input
                                    type="time"
                                    value={newEvent.endTime}
                                    onChange={e => setNewEvent({ ...newEvent, endTime: e.target.value })}
                                    required
                                />
                            </div>
                            <textarea
                                placeholder="Opis"
                                value={newEvent.description}
                                onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                            />
                            <div className="modal-actions">
                                <button type="button" onClick={() => setIsModalOpen(false)}>Anuluj</button>
                                <button type="submit" className="submit-btn">Dodaj</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
