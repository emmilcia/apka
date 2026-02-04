import { useState } from 'react';
import { Plus, Pill, Clock, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export default function MedicationTracker() {
    const [medications, setMedications] = useState([]);
    const [schedule, setSchedule] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newMed, setNewMed] = useState({
        name: '',
        dosage: '',
        description: '',
        timeOfDay: 'morning',
        repetition: 'daily'
    });

    const addMedication = (e) => {
        e.preventDefault();
        const medId = Date.now();
        const med = { ...newMed, id: medId };
        setMedications([...medications, med]);

        // Auto-add to schedule based on repetition (simplified logic for demo)
        setSchedule([...schedule, {
            id: medId + 1,
            medId: medId,
            name: med.name,
            time: med.timeOfDay,
            dosage: med.dosage
        }]);

        setIsModalOpen(false);
        setNewMed({ name: '', dosage: '', description: '', timeOfDay: 'morning', repetition: 'daily' });
    };

    const deleteMed = (id) => {
        setMedications(medications.filter(m => m.id !== id));
        setSchedule(schedule.filter(s => s.medId !== id));
    };

    const ScheduleSlot = ({ title, timeKey }) => (
        <div className="schedule-slot">
            <div className="slot-header">
                <Clock size={16} />
                <h4>{title}</h4>
            </div>
            <div className="slot-content">
                {schedule.filter(s => s.time === timeKey).map(item => (
                    <div key={item.id} className="schedule-item">
                        <span className="med-name">{item.name}</span>
                        <span className="med-dosage">{item.dosage} mg</span>
                    </div>
                ))}
                {schedule.filter(s => s.time === timeKey).length === 0 && (
                    <p className="empty-slot">Brak leków</p>
                )}
            </div>
        </div>
    );

    return (
        <div className="meds-container">
            <section className="planner-section">
                <div className="section-header">
                    <h3>Harmonogram na dziś</h3>
                    <span className="current-date">{format(new Date(), 'EEEE, d MMMM', { locale: pl })}</span>
                </div>
                <div className="schedule-grid">
                    <ScheduleSlot title="Rano" timeKey="morning" />
                    <ScheduleSlot title="Południe" timeKey="noon" />
                    <ScheduleSlot title="Wieczór" timeKey="evening" />
                </div>
            </section>

            <section className="inventory-section">
                <div className="section-header">
                    <h3>Moje Leki</h3>
                    <button className="add-med-btn" onClick={() => setIsModalOpen(true)}>
                        <Plus size={20} /> Dodaj lek
                    </button>
                </div>
                <div className="med-tiles">
                    {medications.map(med => (
                        <div key={med.id} className="med-tile">
                            <div className="tile-header">
                                <div className="med-icon">
                                    <Pill size={24} />
                                </div>
                                <button onClick={() => deleteMed(med.id)} className="delete-med">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="tile-body">
                                <h4>{med.name}</h4>
                                <p className="dosage">{med.dosage} mg</p>
                                <p className="desc">{med.description}</p>
                                <div className="repetition">
                                    <CalendarIcon size={14} />
                                    <span>{med.repetition === 'daily' ? 'Codziennie' : 'Co kilka dni'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {medications.length === 0 && (
                        <div className="empty-inventory">
                            Nie dodano jeszcze żadnych leków.
                        </div>
                    )}
                </div>
            </section>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Dodaj nowy lek</h2>
                        <form onSubmit={addMedication}>
                            <input
                                type="text"
                                placeholder="Nazwa leku"
                                value={newMed.name}
                                onChange={e => setNewMed({ ...newMed, name: e.target.value })}
                                required
                            />
                            <input
                                type="number"
                                placeholder="Dawka (mg)"
                                value={newMed.dosage}
                                onChange={e => setNewMed({ ...newMed, dosage: e.target.value })}
                                required
                            />
                            <textarea
                                placeholder="Na co ten lek? (Opis)"
                                value={newMed.description}
                                onChange={e => setNewMed({ ...newMed, description: e.target.value })}
                            />
                            <div className="form-group">
                                <label>Pora dnia:</label>
                                <select
                                    value={newMed.timeOfDay}
                                    onChange={e => setNewMed({ ...newMed, timeOfDay: e.target.value })}
                                >
                                    <option value="morning">Rano</option>
                                    <option value="noon">Południe</option>
                                    <option value="evening">Wieczór</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Powtarzaj:</label>
                                <select
                                    value={newMed.repetition}
                                    onChange={e => setNewMed({ ...newMed, repetition: e.target.value })}
                                >
                                    <option value="daily">Codziennie</option>
                                    <option value="interval">Co kilka dni</option>
                                </select>
                            </div>
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
