import { useState, useEffect, useRef } from 'react';
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
    orderBy,
    writeBatch
} from 'firebase/firestore';
import {
    Plus,
    Trash2,
    Edit3,
    Folder,
    ChevronRight,
    Bold,
    Underline,
    Save,
    X,
    FileText,
    ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export default function Notes() {
    const [notes, setNotes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeTab, setActiveTab] = useState('folders'); // folders, list, editor
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [editingNote, setEditingNote] = useState(null);
    const [viewingNote, setViewingNote] = useState(null);
    const [activeFormats, setActiveFormats] = useState({ bold: false, underline: false });

    // Editor State
    const [noteTitle, setNoteTitle] = useState('');
    const [noteCategory, setNoteCategory] = useState('');
    const editorRef = useRef(null);

    const user = auth.currentUser;

    useEffect(() => {
        if (!user) return;

        // Simplified query to avoid index requirements for now
        const q = query(
            collection(db, 'notes'),
            where('userId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notesList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt) || 0;
                const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt) || 0;
                return dateB - dateA;
            });

            console.log("Pobrano notatki:", notesList.length);
            setNotes(notesList);

            // Extract unique categories
            const cats = [...new Set(notesList.map(n => n.category))].filter(Boolean);
            setCategories(cats);
        }, (err) => {
            console.error("Firestore onSnapshot error:", err);
        });

        return () => unsubscribe();
    }, [user]);

    const checkActiveFormats = () => {
        setActiveFormats({
            bold: document.queryCommandState('bold'),
            underline: document.queryCommandState('underline')
        });
    };

    const handleFormat = (command) => {
        document.execCommand(command, false, null);
        checkActiveFormats();
    };

    const handleSaveNote = async () => {
        if (!noteTitle.trim()) {
            alert('Wpisz tytuł notatki');
            return;
        }
        if (!noteCategory.trim()) {
            alert('Wybierz lub wpisz kategorię');
            return;
        }

        const noteData = {
            title: noteTitle,
            content: editorRef.current.innerHTML,
            category: noteCategory,
            userId: user.uid,
            updatedAt: new Date(),
        };

        try {
            if (editingNote) {
                await updateDoc(doc(db, 'notes', editingNote.id), noteData);
            } else {
                await addDoc(collection(db, 'notes'), {
                    ...noteData,
                    createdAt: new Date()
                });
            }
            resetEditor();
            setActiveTab('folders');
        } catch (err) {
            console.error("Błąd zapisu notatki:", err);
        }
    };

    const deleteNote = async (id, e) => {
        e?.stopPropagation();
        if (window.confirm('Czy na pewno chcesz usunąć tę notatkę?')) {
            try {
                await deleteDoc(doc(db, 'notes', id));
                if (viewingNote?.id === id) setViewingNote(null);
            } catch (err) {
                console.error("Błąd usuwania:", err);
            }
        }
    };

    const deleteFolder = async (category, e) => {
        e?.stopPropagation();
        if (window.confirm(`Czy na pewno chcesz usunąć cały folder "${category}" wraz ze wszystkimi notatkami (${notes.filter(n => n.category === category).length})?`)) {
            try {
                const batch = writeBatch(db);
                const notesInFolder = notes.filter(n => n.category === category);

                notesInFolder.forEach((note) => {
                    batch.delete(doc(db, 'notes', note.id));
                });

                await batch.commit();
                console.log(`Usunięto folder: ${category}`);
            } catch (err) {
                console.error("Błąd usuwania folderu:", err);
            }
        }
    };

    const startEditing = (note, e) => {
        e?.stopPropagation();
        setEditingNote(note);
        setNoteTitle(note.title);
        setNoteCategory(note.category);
        setActiveTab('editor');
        setTimeout(() => {
            if (editorRef.current) {
                editorRef.current.innerHTML = note.content;
                checkActiveFormats(); // Check formats after content is loaded
            }
        }, 100);
    };

    const resetEditor = () => {
        setEditingNote(null);
        setNoteTitle('');
        setNoteCategory(selectedCategory || ''); // Pre-fill category if one is selected
        if (editorRef.current) editorRef.current.innerHTML = '';
        setActiveFormats({ bold: false, underline: false }); // Reset formats
    };

    const filteredNotes = selectedCategory
        ? notes.filter(n => n.category === selectedCategory)
        : notes; // Fallback to all notes if something goes wrong, but UI won't show list without selection

    const renderFolders = () => (
        <div className="notes-folders-grid">
            {categories.map(cat => (
                <div
                    key={cat}
                    className="folder-card"
                    onClick={() => {
                        setSelectedCategory(cat);
                        setActiveTab('list');
                    }}
                >
                    <button
                        className="folder-delete-btn"
                        onClick={(e) => deleteFolder(cat, e)}
                        title="Usuń folder"
                    >
                        <Trash2 size={16} />
                    </button>
                    <div className="folder-icon">
                        <Folder size={32} />
                    </div>
                    <h3>{cat}</h3>
                    <p>{notes.filter(n => n.category === cat).length} notatek</p>
                </div>
            ))}

            <button
                className="add-inline-btn"
                onClick={() => {
                    setSelectedCategory(''); // Clear selected category for new note
                    setActiveTab('editor');
                    resetEditor();
                }}
            >
                <Plus size={24} />
                <span>Nowa Notatka</span>
            </button>
        </div>
    );

    const renderNoteList = () => (
        <div className="notes-list-container">
            <div className="notes-list-header">
                <button onClick={() => {
                    setSelectedCategory(null); // Clear selected category when going back to folders
                    setActiveTab('folders');
                }} className="back-btn">
                    <ArrowLeft size={20} />
                    <span>Foldery</span>
                </button>
                <h2>{selectedCategory}</h2> {/* Display only the selected category */}
                <button
                    className="add-note-action"
                    onClick={() => {
                        resetEditor();
                        setActiveTab('editor');
                    }}
                >
                    <Plus size={20} />
                </button>
            </div>

            <div className="notes-grid">
                {filteredNotes.length === 0 && (
                    <p className="empty-msg">Brak notatek w tej kategorii.</p>
                )}
                {filteredNotes.map(note => (
                    <div
                        key={note.id}
                        className="note-card"
                        onClick={() => {
                            setViewingNote(note);
                            setActiveTab('viewer');
                        }}
                    >
                        <div className="note-card-header">
                            <h4>{note.title}</h4>
                            <div className="note-actions">
                                <button onClick={(e) => startEditing(note, e)}><Edit3 size={16} /></button>
                                <button onClick={(e) => deleteNote(note.id, e)}><Trash2 size={16} /></button>
                            </div>
                        </div>
                        <div
                            className="note-preview"
                            dangerouslySetInnerHTML={{ __html: note.content }}
                        />
                        <div className="note-footer">
                            <span className="note-category">{note.category}</span>
                            <span className="note-date">
                                {format(note.createdAt?.toDate?.() || new Date(), 'd MMM', { locale: pl })}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderViewer = () => viewingNote && (
        <div className="note-viewer-container">
            <div className="viewer-header">
                <button onClick={() => setActiveTab('list')} className="back-btn">
                    <ArrowLeft size={20} />
                </button>
                <div className="viewer-actions">
                    <button onClick={(e) => startEditing(viewingNote, e)} className="edit-action"><Edit3 size={18} /> Edytuj</button>
                    <button onClick={() => deleteNote(viewingNote.id)} className="delete-action"><Trash2 size={18} /></button>
                </div>
            </div>
            <div className="viewer-content">
                <div className="viewer-meta">
                    <span className="viewer-cat">{viewingNote.category}</span>
                    <span className="viewer-date">
                        {format(viewingNote.createdAt?.toDate?.() || new Date(), 'PPPP', { locale: pl })}
                    </span>
                </div>
                <h1>{viewingNote.title}</h1>
                <div
                    className="rich-content"
                    dangerouslySetInnerHTML={{ __html: viewingNote.content }}
                />
            </div>
        </div>
    );

    const renderEditor = () => (
        <div className="note-editor-container">
            <div className="editor-header">
                <button onClick={() => setActiveTab(selectedCategory ? 'list' : 'folders')} className="cancel-btn">
                    <X size={20} />
                </button>
                <div className="editor-controls">
                    <button
                        className={activeFormats.bold ? 'active' : ''}
                        onMouseDown={(e) => { e.preventDefault(); handleFormat('bold'); }}
                        title="Pogrubienie"
                    >
                        <Bold size={18} />
                    </button>
                    <button
                        className={activeFormats.underline ? 'active' : ''}
                        onMouseDown={(e) => { e.preventDefault(); handleFormat('underline'); }}
                        title="Podkreślenie"
                    >
                        <Underline size={18} />
                    </button>
                </div>
                <button onClick={handleSaveNote} className="save-btn">
                    <Save size={18} />
                    <span>Zapisz</span>
                </button>
            </div>

            <div className="editor-inputs">
                <div className="category-select-wrapper mini">
                    <div className="category-input-group">
                        <select
                            value={noteCategory}
                            onChange={(e) => setNoteCategory(e.target.value)}
                        >
                            <option value="">Kategoria...</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="NEW">+ Nowa kategoria</option>
                        </select>
                        {(noteCategory === 'NEW' || (noteCategory && !categories.includes(noteCategory))) && (
                            <input
                                type="text"
                                placeholder="Nazwa nowej kategorii"
                                value={noteCategory === 'NEW' ? '' : noteCategory}
                                onChange={(e) => setNoteCategory(e.target.value)}
                                autoFocus
                            />
                        )}
                    </div>
                </div>
                <input
                    type="text"
                    className="note-title-input"
                    placeholder="Tytuł notatki..."
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                />

                <div
                    ref={editorRef}
                    className="rich-editor"
                    contentEditable
                    onInput={checkActiveFormats}
                    onKeyUp={checkActiveFormats}
                    onMouseUp={checkActiveFormats}
                    placeholder="Zacznij pisać swoją notatkę tutaj..."
                />
            </div>
        </div>
    );

    return (
        <div className="notes-container">
            {activeTab === 'folders' && renderFolders()}
            {activeTab === 'list' && renderNoteList()}
            {activeTab === 'editor' && renderEditor()}
            {activeTab === 'viewer' && renderViewer()}
        </div>
    );
}
