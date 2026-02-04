import { useState } from 'react';
import { Plus, Trash2, ArrowRight, ArrowLeft } from 'lucide-react';

const PRIORITY_LABELS = {
    high: 'Ważny',
    urgent: 'Bardzo ważny',
    low: 'Mało ważny'
};

const PRIORITY_COLORS = {
    high: '#fca5a5',
    urgent: '#ef4444',
    low: '#93c5fd'
};

export default function TodoList() {
    const [tasks, setTasks] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        priority: 'low',
        deadline: '',
        status: 'todo'
    });

    const addTask = (e) => {
        e.preventDefault();
        if (!newTask.title) return;
        setTasks([...tasks, { ...newTask, id: Date.now() }]);
        setNewTask({ title: '', description: '', priority: 'low', deadline: '', status: 'todo' });
        setIsModalOpen(false);
    };

    const moveTask = (id, newStatus) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
    };

    const deleteTask = (id) => {
        setTasks(tasks.filter(t => t.id !== id));
    };

    const Column = ({ title, status, tasks }) => (
        <div className="todo-column">
            <div className="column-header">
                <h3>{title}</h3>
                {status === 'todo' && (
                    <button className="add-task-btn" onClick={() => setIsModalOpen(true)}>
                        <Plus size={20} />
                    </button>
                )}
            </div>
            <div className="task-list">
                {tasks.filter(t => t.status === status).map(task => (
                    <div key={task.id} className="task-card" style={{ borderLeft: `4px solid ${PRIORITY_COLORS[task.priority]}` }}>
                        <div className="task-header">
                            <h4>{task.title}</h4>
                            <button onClick={() => deleteTask(task.id)} className="delete-btn">
                                <Trash2 size={16} />
                            </button>
                        </div>
                        <p className="task-desc">{task.description}</p>
                        <div className="task-footer">
                            <span className="priority-badge">{PRIORITY_LABELS[task.priority]}</span>
                            {task.deadline && <span className="deadline">{new Date(task.deadline).toLocaleString()}</span>}
                        </div>
                        <div className="task-actions">
                            {status !== 'todo' && (
                                <button onClick={() => moveTask(task.id, status === 'done' ? 'in-progress' : 'todo')}>
                                    <ArrowLeft size={16} />
                                </button>
                            )}
                            {status !== 'done' && (
                                <button onClick={() => moveTask(task.id, status === 'todo' ? 'in-progress' : 'done')}>
                                    <ArrowRight size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="todo-container">
            <div className="todo-grid">
                <Column title="Do zrobienia" status="todo" tasks={tasks} />
                <Column title="W trakcie" status="in-progress" tasks={tasks} />
                <Column title="Zrobione" status="done" tasks={tasks} />
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Nowe zadanie</h2>
                        <form onSubmit={addTask}>
                            <input
                                type="text"
                                placeholder="Nazwa zadania"
                                value={newTask.title}
                                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                required
                            />
                            <textarea
                                placeholder="Opis"
                                value={newTask.description}
                                onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                            />
                            <select
                                value={newTask.priority}
                                onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                            >
                                <option value="low">Mało ważny</option>
                                <option value="high">Ważny</option>
                                <option value="urgent">Bardzo ważny</option>
                            </select>
                            <input
                                type="datetime-local"
                                value={newTask.deadline}
                                onChange={e => setNewTask({ ...newTask, deadline: e.target.value })}
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
