import { useState } from 'react'
import TodoList from './components/TodoList.jsx'
import Calendar from './components/Calendar.jsx'
import MedicationTracker from './components/MedicationTracker.jsx'
import './index.css'

function App() {
    const [activeTab, setActiveTab] = useState('todo')

    return (
        <div className="app-container">
            <header className="app-header">
                <nav className="app-nav">
                    <button
                        className={activeTab === 'calendar' ? 'active' : ''}
                        onClick={() => setActiveTab('calendar')}
                    >
                        Kalendarz
                    </button>
                    <button
                        className={activeTab === 'todo' ? 'active' : ''}
                        onClick={() => setActiveTab('todo')}
                    >
                        Lista zadań
                    </button>
                    <button
                        className={activeTab === 'meds' ? 'active' : ''}
                        onClick={() => setActiveTab('meds')}
                    >
                        Leki
                    </button>
                </nav>
            </header>
            <main className="app-main">
                {activeTab === 'calendar' && <Calendar />}
                {activeTab === 'todo' && <TodoList />}
                {activeTab === 'meds' && <MedicationTracker />}
            </main>
        </div>
    )
}

export default App
