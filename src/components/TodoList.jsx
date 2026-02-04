import { useState } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';

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
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        priority: 'low',
        deadline: '',
        status: 'todo'
    });

    const handleSaveTask = (e) => {
        e.preventDefault();
        if (!newTask.title) return;

        if (editingTaskId) {
            setTasks(tasks.map(t => t.id === editingTaskId ? { ...newTask, id: editingTaskId } : t));
        } else {
            setTasks([...tasks, { ...newTask, id: Date.now() }]);
        }

        closeModal();
    };

    const deleteTask = (id) => {
        setTasks(tasks.filter(t => t.id !== id));
    };

    const startEditing = (task) => {
        setEditingTaskId(task.id);
        setNewTask(task);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setEditingTaskId(null);
        setNewTask({ title: '', description: '', priority: 'low', deadline: '', status: 'todo' });
        setIsModalOpen(false);
    };

    const onDragStart = (e, taskId) => {
        e.dataTransfer.setData('taskId', taskId);
    };

    const onDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    };

    const onDragLeave = (e) => {
        e.currentTarget.classList.remove('drag-over');
    };

    const onDrop = (e, newStatus) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        const taskId = e.dataTransfer.getData('taskId');
        moveTask(parseInt(taskId), newStatus);
    };

    const moveTask = (id, newStatus) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
    };

    const Column = ({ title, status, tasks }) => (
        <div
            className="todo-column"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, status)}
        >
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
                    <div
                        key={task.id}
                        className="task-card"
                        draggable
                        onDragStart={(e) => onDragStart(e, task.id)}
                        style={{ borderLeft: `4px solid ${PRIORITY_COLORS[task.priority]}` }}
                    >
                        <div className="task-header">
                            <h4>{task.title}</h4>
                            <div className="task-actions-btns">
                                <button onClick={() => startEditing(task)} className="edit-btn">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => deleteTask(task.id)} className="delete-btn">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        <p className="task-desc">{task.description}</p>
                        <div className="task-footer">
                            <span className="priority-badge">{PRIORITY_LABELS[task.priority]}</span>
                            {task.deadline && <span className="deadline">{new Date(task.deadline).toLocaleString()}</span>}
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
                        <h2>{editingTaskId ? 'Edytuj zadanie' : 'Nowe zadanie'}</h2>
                        <form onSubmit={handleSaveTask}>
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
                                <button type="button" onClick={closeModal}>Anuluj</button>
                                <button type="submit" className="submit-btn">{editingTaskId ? 'Zapisz' : 'Dodaj'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
