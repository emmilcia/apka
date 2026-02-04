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
    deleteField
} from 'firebase/firestore';
import { Plus, Trash2, Edit2 } from 'lucide-react';

const PRIORITY_LABELS = {
    high: 'Ważny',
    urgent: 'Bardzo ważny',
    low: 'Mało ważny'
};

const PRIORITY_COLORS = {
    high: 'var(--primary-color)',   // Was #fca5a5 (Pink-ish) -> Theme Primary
    urgent: '#ef4444',              // Red - Keep red for urgent? Or make it variable? User said "everything pink". Red is not pink.
    low: '#93c5fd'                  // Blue - Keep as is? Or use theme tertiary?
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

    const user = auth.currentUser;

    useEffect(() => {
        if (!user) return;

        const q = query(collection(db, 'tasks'), where('userId', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const taskList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTasks(taskList);
        }, (error) => {
            console.error("Błąd ładowania zadań:", error);
        });

        return () => unsubscribe();
    }, [user]);

    // Auto-remove completed tasks older than 48 hours
    useEffect(() => {
        const cleanupTasks = () => {
            const now = new Date();
            const TWO_DAYS_MS = 48 * 60 * 60 * 1000;

            tasks.forEach(task => {
                if (task.status === 'done' && task.completedAt) {
                    const completedDate = task.completedAt.toDate ? task.completedAt.toDate() : new Date(task.completedAt);
                    if (now - completedDate > TWO_DAYS_MS) {
                        deleteTask(task.id);
                    }
                }
            });
        };

        const interval = setInterval(cleanupTasks, 60 * 60 * 1000); // Check every hour
        cleanupTasks(); // Check on mount/update

        return () => clearInterval(interval);
    }, [tasks]);

    const handleSaveTask = async (e) => {
        e.preventDefault();
        if (!newTask.title || !user) return;

        try {
            if (editingTaskId) {
                const taskRef = doc(db, 'tasks', editingTaskId);
                await updateDoc(taskRef, newTask);
            } else {
                await addDoc(collection(db, 'tasks'), {
                    ...newTask,
                    userId: user.uid,
                    createdAt: new Date()
                });
            }
            closeModal();
        } catch (err) {
            console.error("Błąd zapisu:", err);
            alert("Nie udało się zapisać zadania. Sprawdź konfigurację Firebase.");
        }
    };

    const deleteTask = async (id) => {
        try {
            await deleteDoc(doc(db, 'tasks', id));
        } catch (err) {
            console.error("Błąd usuwania:", err);
        }
    };

    const startEditing = (task) => {
        setEditingTaskId(task.id);
        setNewTask({
            title: task.title,
            description: task.description,
            priority: task.priority,
            deadline: task.deadline,
            status: task.status
        });
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
        moveTask(taskId, newStatus);
    };

    const moveTask = async (id, newStatus) => {
        try {
            const taskRef = doc(db, 'tasks', id);
            const updateData = { status: newStatus };

            if (newStatus === 'done') {
                updateData.completedAt = new Date();
            } else {
                updateData.completedAt = deleteField();
            }

            await updateDoc(taskRef, updateData);
        } catch (err) {
            console.error("Błąd przesuwania:", err);
        }
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
