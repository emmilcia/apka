import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { jsPDF } from 'jspdf';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { Wallet as WalletIcon, CreditCard, Banknote, PiggyBank, Plus, ArrowUpRight, ArrowDownLeft, Trash2, TrendingUp, Sparkles, LayoutDashboard, Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export default function Wallet() {
    const [transactions, setTransactions] = useState([]);
    const [piggyBank, setPiggyBank] = useState([]);
    const [isTransModalOpen, setIsTransModalOpen] = useState(false);
    const [isPiggyModalOpen, setIsPiggyModalOpen] = useState(false);
    const [loans, setLoans] = useState([]);
    const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);

    // Form States
    const [newTrans, setNewTrans] = useState({
        amount: '',
        description: '',
        type: 'card', // card | cash
        category: 'expense', // expense | income
        subCategory: 'Inne'
    });

    const [newPiggy, setNewPiggy] = useState({
        amount: '',
        description: ''
    });

    const [newLoan, setNewLoan] = useState({
        amount: '',
        person: '',
        description: '',
        type: 'borrowed' // 'borrowed' (I owe) | 'lent' (Owed to me)
    });

    const user = auth.currentUser;

    useEffect(() => {
        if (!user) return;

        // Transactions Listener
        const qTrans = query(
            collection(db, 'transactions'),
            where('userId', '==', user.uid)
        );
        const unsubTrans = onSnapshot(qTrans, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Client-side sort
            data.sort((a, b) => b.date.seconds - a.date.seconds);
            setTransactions(data);
        }, (error) => {
            console.error("Error fetching transactions:", error);
        });

        // PiggyBank Listener
        const qPiggy = query(
            collection(db, 'piggybank'),
            where('userId', '==', user.uid)
        );
        const unsubPiggy = onSnapshot(qPiggy, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Client-side sort
            data.sort((a, b) => b.date.seconds - a.date.seconds);
            setPiggyBank(data);
        }, (error) => {
            console.error("Error fetching piggybank:", error);
        });

        // Loans Listener
        const qLoans = query(
            collection(db, 'loans'),
            where('userId', '==', user.uid)
        );
        const unsubLoans = onSnapshot(qLoans, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            data.sort((a, b) => b.date.seconds - a.date.seconds);
            setLoans(data);
        }, (error) => {
            console.error("Error fetching loans:", error);
        });

        return () => {
            unsubTrans();
            unsubPiggy();
            unsubLoans();
        };
    }, [user]);

    // Derived State
    const cardTransactions = transactions.filter(t => t.type === 'card');
    const cashTransactions = transactions.filter(t => t.type === 'cash');

    const totalCard = cardTransactions.reduce((acc, t) => acc + (t.category === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount)), 0);
    const totalCash = cashTransactions.reduce((acc, t) => acc + (t.category === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount)), 0);
    const piggyTotal = piggyBank.reduce((acc, t) => acc + parseFloat(t.amount), 0);

    // Loan Totals
    const totalBorrowed = loans.filter(l => l.type === 'borrowed' || !l.type).reduce((acc, t) => acc + parseFloat(t.amount), 0);
    const totalLent = loans.filter(l => l.type === 'lent').reduce((acc, t) => acc + parseFloat(t.amount), 0);

    // Repayment Suggestion Logic
    const totalBalance = totalCard + totalCash;
    const repayableLoans = loans.filter(l => (l.type === 'borrowed' || !l.type) && parseFloat(l.amount) <= totalBalance);

    // Chart Data Preparation (Balance History - Last 20 transactions)
    const chartData = [...transactions] // Copy to not mutate state
        .slice(0, 20)
        .reverse() // Oldest first
        .reduce((acc, t) => {
            const amount = t.category === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount);
            const prevBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
            acc.push({
                ...t,
                balance: prevBalance + amount
            });
            return acc;
        }, []);



    // SVG Logic
    const getSvgPath = () => {
        if (chartData.length < 2) return '';

        const balances = chartData.map(d => d.balance);
        const min = Math.min(...balances);
        const max = Math.max(...balances);
        const range = max - min || 1; // Avoid division by zero

        // ViewBox 300 x 100
        const points = chartData.map((d, i) => {
            const x = (i / (chartData.length - 1)) * 300;
            // Normalize y: min maps to 100 (bottom), max maps to 0 (top), with 20px padding
            const y = 90 - ((d.balance - min) / range) * 80;
            return `${x},${y}`;
        });

        return `M ${points.join(' L ')}`;
    };

    // Category Analytics (Pie Chart Data)
    const expenseCategories = transactions
        .filter(t => t.category === 'expense')
        .reduce((acc, t) => {
            const cat = t.subCategory || 'Inne';
            acc[cat] = (acc[cat] || 0) + parseFloat(t.amount);
            return acc;
        }, {});

    const pieData = Object.entries(expenseCategories).map(([name, value]) => ({ name, value }));
    const totalExpenses = pieData.reduce((acc, d) => acc + d.value, 0);

    const getPieSlices = () => {
        let accumulatedAngle = 0;
        return pieData.map((d, i) => {
            const angle = (d.value / totalExpenses) * 360;
            const x1 = Math.cos((accumulatedAngle - 90) * Math.PI / 180) * 40 + 50;
            const y1 = Math.sin((accumulatedAngle - 90) * Math.PI / 180) * 40 + 50;
            accumulatedAngle += angle;
            const x2 = Math.cos((accumulatedAngle - 90) * Math.PI / 180) * 40 + 50;
            const y2 = Math.sin((accumulatedAngle - 90) * Math.PI / 180) * 40 + 50;

            const largeArc = angle > 180 ? 1 : 0;
            return (
                <path
                    key={i}
                    d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                    fill={`hsl(${i * 45}, 70%, 65%)`}
                    stroke="var(--glass-border)"
                    strokeWidth="1"
                    className="pie-slice"
                >
                    <title>{d.name}: {d.value.toFixed(2)} zł</title>
                </path>
            );
        });
    };

    // Helper for safe date formatting
    const formatDate = (date) => {
        if (!date) return '';
        if (date.seconds) return format(new Date(date.seconds * 1000), 'dd.MM');
        return format(new Date(date), 'dd.MM');
    };

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        if (!newTrans.amount) {
            console.error("No amount!");
            return;
        }

        try {
            await addDoc(collection(db, 'transactions'), {
                ...newTrans,
                userId: user.uid,
                date: new Date(),
                amount: parseFloat(newTrans.amount)
            });

            // Auto-delete older transactions to keep max 20
            if (transactions.length >= 20) {
                const toDelete = transactions.slice(19);
                await Promise.all(toDelete.map(t => deleteDoc(doc(db, 'transactions', t.id))));
            }

            console.log("Transaction added");
            setIsTransModalOpen(false);
            setNewTrans({ amount: '', description: '', type: 'card', category: 'expense', subCategory: 'Inne' });
        } catch (err) {
            console.error("Error adding transaction: ", err);
            alert("Błąd: " + err.message);
        }
    };

    const handleAddPiggy = async (e) => {
        e.preventDefault();
        if (!user || !newPiggy.amount) return;

        try {
            await addDoc(collection(db, 'piggybank'), {
                ...newPiggy,
                userId: user.uid,
                date: new Date(),
                amount: parseFloat(newPiggy.amount)
            });
            setIsPiggyModalOpen(false);
            setNewPiggy({ amount: '', description: '' });
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddLoan = async (e) => {
        e.preventDefault();
        if (!user || !newLoan.amount || !newLoan.person) return;

        try {
            await addDoc(collection(db, 'loans'), {
                ...newLoan,
                userId: user.uid,
                date: new Date(),
                amount: parseFloat(newLoan.amount)
            });
            setIsLoanModalOpen(false);
            setNewLoan({ amount: '', person: '', description: '', type: 'borrowed' });
        } catch (err) {
            console.error(err);
        }
    };

    const handleSettleLoan = async (loan) => {
        if (!confirm(`Rozliczyć tę pożyczkę? (${loan.person}: ${loan.amount} zł)`)) return;

        try {
            await addDoc(collection(db, 'transactions'), {
                amount: parseFloat(loan.amount),
                description: `Rozliczenie: ${loan.person} (${loan.description || ''})`,
                type: 'cash',
                category: loan.type === 'borrowed' ? 'expense' : 'income',
                userId: user.uid,
                date: new Date()
            });
            await deleteDoc(doc(db, 'loans', loan.id));
        } catch (err) {
            console.error("Error settling loan:", err);
        }
    };

    const handleDeleteTrans = async (id) => {
        if (confirm('Usunąć transakcję?')) {
            await deleteDoc(doc(db, 'transactions', id));
        }
    };

    const handleDeletePiggy = async (id) => {
        if (confirm('Usunąć wpłatę?')) {
            await deleteDoc(doc(db, 'piggybank', id));
        }
    }

    const handleDeleteLoan = async (id) => {
        if (confirm('Usunąć pożyczkę?')) {
            await deleteDoc(doc(db, 'loans', id));
        }
    }

    const exportToCSV = () => {
        const headers = ['Data', 'Opis', 'Kategoria', 'Subkategoria', 'Kwota', 'Typ'];
        const rows = transactions.map(t => [
            format(t.date.toDate(), 'yyyy-MM-dd HH:mm'),
            t.description || '',
            t.category,
            t.subCategory || '',
            t.amount,
            t.type
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `transakcje_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToTXT = () => {
        const title = `RAPORT FINANSOWY - ${format(new Date(), 'dd.MM.yyyy')}\n`;
        const separator = "--------------------------------------------------------------------------------\n";
        const header = "DATA       | OPIS                     | KATEGORIA | KWOTA\n";

        let content = title + separator + header + separator;

        transactions.forEach(t => {
            const date = format(t.date.toDate(), 'dd.MM HH:mm').padEnd(10);
            const desc = (t.description || 'Płatność').substring(0, 24).padEnd(25);
            const cat = t.category === 'income' ? 'PRZYCHÓD ' : 'WYDATEK  ';
            const amount = `${parseFloat(t.amount).toFixed(2)} zł`.padStart(10);
            content += `${date} | ${desc} | ${cat} | ${amount}\n`;
        });

        content += separator;
        content += `SUMA KARTA:   ${totalCard.toFixed(2)} zł\n`;
        content += `SUMA GOTÓWKA: ${totalCash.toFixed(2)} zł\n`;
        content += `SKARBONKA:    ${piggyTotal.toFixed(2)} zł\n`;

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `raport_${format(new Date(), 'yyyy-MM-dd')}.txt`);
        link.click();
    };

    const exportToPDF = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(41, 128, 185);
        doc.text("Raport Finansowy", 20, 20);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Data wygenerowania: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`, 20, 30);

        // Summary Card Area
        doc.setDrawColor(200);
        doc.setFillColor(245, 245, 245);
        doc.rect(20, 40, 170, 30, 'F');

        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`Suma na kontach: ${(totalCard + totalCash).toFixed(2)} zł`, 30, 50);
        doc.text(`Suma Karta: ${totalCard.toFixed(2)} zł`, 30, 60);
        doc.text(`Suma Gotówka: ${totalCash.toFixed(2)} zł`, 110, 60);

        // Transactions Table
        doc.setFontSize(14);
        doc.text("Ostatnie transakcje", 20, 85);

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Data", 20, 95);
        doc.text("Opis", 50, 95);
        doc.text("Kat.", 120, 95);
        doc.text("Kwota", 170, 95);

        doc.line(20, 97, 190, 97);
        doc.setFont("helvetica", "normal");

        let y = 105;
        transactions.slice(0, 20).forEach(t => {
            if (y > 280) {
                doc.addPage();
                y = 20;
            }
            doc.text(format(t.date.toDate(), 'dd.MM HH:mm'), 20, y);
            doc.text((t.description || 'Płatność').substring(0, 30), 50, y);
            doc.text(t.category === 'income' ? 'Przych.' : 'Wyd.', 120, y);
            doc.text(`${parseFloat(t.amount).toFixed(2)} zł`, 170, y);
            y += 10;
        });

        doc.save(`raport_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    return (
        <div className="wallet-container">
            {/* Header / Totals */}
            <div className="wallet-header-grid">
                <div className="balance-card card-balance">
                    <div className="balance-icon"><CreditCard size={24} /></div>
                    <div className="balance-info">
                        <h3>Karta</h3>
                        <span className={totalCard < 0 ? 'negative' : ''}>{totalCard.toFixed(2)} zł</span>
                    </div>
                </div>
                <div className="balance-card cash-balance">
                    <div className="balance-icon"><Banknote size={24} /></div>
                    <div className="balance-info">
                        <h3>Gotówka</h3>
                        <span className={totalCash < 0 ? 'negative' : ''}>{totalCash.toFixed(2)} zł</span>
                    </div>
                </div>
                <div className="balance-card total-balance">
                    <div className="balance-icon"><WalletIcon size={24} /></div>
                    <div className="balance-info">
                        <h3>Suma całkowita</h3>
                        <span className={totalBalance < 0 ? 'negative' : ''}>{totalBalance.toFixed(2)} zł</span>
                    </div>
                </div>
            </div>

            {/* Analytics Section */}
            <div className="wallet-analytics-grid">
                <div className="wallet-chart-section">
                    <div className="section-header">
                        <h3><TrendingUp size={20} /> Historia salda</h3>
                    </div>
                    <div className="chart-container-svg">
                        {chartData.length > 1 ? (
                            <svg viewBox="0 0 300 100" className="line-chart-svg">
                                <defs>
                                    <linearGradient id="lineGradient" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="var(--primary-color)" stopOpacity="0.4" />
                                        <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <path
                                    d={`${getSvgPath()} L 300,150 L 0,150 Z`}
                                    fill="url(#lineGradient)"
                                    stroke="none"
                                />
                                <path
                                    d={getSvgPath()}
                                    fill="none"
                                    stroke="var(--primary-color)"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="chart-line"
                                />
                                {chartData.map((d, i) => {
                                    const min = Math.min(...chartData.map(x => x.balance));
                                    const max = Math.max(...chartData.map(x => x.balance));
                                    const range = max - min || 1;
                                    const x = (i / (chartData.length - 1)) * 300;
                                    const y = 90 - ((d.balance - min) / range) * 80;
                                    return (
                                        <circle
                                            key={d.id}
                                            cx={x}
                                            cy={y}
                                            r="3"
                                            fill="var(--bg-card)"
                                            stroke="var(--primary-color)"
                                            strokeWidth="2"
                                        >
                                            <title>{d.description}: {d.balance.toFixed(2)} zł ({formatDate(d.date)})</title>
                                        </circle>
                                    );
                                })}
                            </svg>
                        ) : (
                            <p className="no-data">Dodaj więcej transakcji, aby zobaczyć wykres</p>
                        )}
                    </div>
                </div>

                <div className="wallet-chart-section pie-analytics">
                    <div className="section-header">
                        <h3><LayoutDashboard size={20} /> Podział wydatków</h3>
                    </div>
                    <div className="pie-container">
                        {totalExpenses > 0 ? (
                            <div className="pie-layout">
                                <svg viewBox="0 0 100 100" className="pie-chart-svg">
                                    {getPieSlices()}
                                    <circle cx="50" cy="50" r="25" fill="#1a1a1a" />
                                    <text x="50" y="55" fontSize="8" textAnchor="middle" fill="white" fontWeight="bold">
                                        -{totalExpenses.toFixed(0)} zł
                                    </text>
                                </svg>
                                <div className="pie-legend">
                                    {pieData.map((d, i) => (
                                        <div key={i} className="legend-item">
                                            <span className="dot" style={{ background: `hsl(${i * 45}, 70%, 65%)` }}></span>
                                            <span className="name">{d.name}</span>
                                            <span className="val">{((d.value / totalExpenses) * 100).toFixed(0)}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="empty-chart">Brak wydatków do analizy</div>
                        )}
                    </div>
                </div>
            </div>



            {/* Actions */}
            <div className="wallet-actions">
                <button className="action-btn" onClick={() => setIsTransModalOpen(true)}>
                    <Plus size={20} /> Dodaj transakcję
                </button>
                <button className="action-btn secondary-btn" onClick={exportToPDF}>
                    <FileText size={20} /> Eksportuj PDF
                </button>
            </div>

            {/* Transaction Lists */}
            <div className="transaction-lists-grid">
                <div className="trans-column">
                    <div className="column-header-wallet">
                        <h3>Transakcje Karta</h3>
                    </div>
                    <div className="trans-list">
                        {cardTransactions.map(t => (
                            <div key={t.id} className="trans-item">
                                <div className={`trans-icon ${t.category}`}>
                                    {t.category === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                                </div>
                                <div className="trans-details">
                                    <strong>{t.description || 'Płatność'}</strong>
                                    <span className="trans-date">{format(t.date.toDate(), 'dd.MM HH:mm')}</span>
                                </div>
                                <div className={`trans-amount ${t.category}`}>
                                    {t.category === 'income' ? '+' : '-'}{parseFloat(t.amount).toFixed(2)} zł
                                    <button onClick={() => handleDeleteTrans(t.id)} className="delete-mini"><Trash2 size={12} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="trans-column">
                    <div className="column-header-wallet">
                        <h3>Transakcje Gotówka</h3>
                    </div>
                    <div className="trans-list">
                        {cashTransactions.map(t => (
                            <div key={t.id} className="trans-item">
                                <div className={`trans-icon ${t.category}`}>
                                    {t.category === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                                </div>
                                <div className="trans-details">
                                    <strong>{t.description || 'Płatność'}</strong>
                                    <span className="trans-date">{format(t.date.toDate(), 'dd.MM HH:mm')}</span>
                                </div>
                                <div className={`trans-amount ${t.category}`}>
                                    {t.category === 'income' ? '+' : '-'}{parseFloat(t.amount).toFixed(2)} zł
                                    <button onClick={() => handleDeleteTrans(t.id)} className="delete-mini"><Trash2 size={12} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Loans Section */}
            <div className="loans-section">
                <div className="loans-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h3>💸 Pożyczki</h3>
                        <button className="add-btn-small" onClick={() => setIsLoanModalOpen(true)} title="Dodaj">
                            <Plus size={18} />
                        </button>
                    </div>
                    <div className="loans-summary">
                        {totalBorrowed > 0 && <span className="loans-total red-text">Wiszę: -{totalBorrowed.toFixed(2)} zł</span>}
                        {totalLent > 0 && <span className="loans-total green-text"> Wiszą mi: +{totalLent.toFixed(2)} zł</span>}
                    </div>
                </div>

                {repayableLoans.length > 0 && (
                    <div className="repayment-alert">
                        <span>💡 Stać Cię na spłatę: </span>
                        <strong>{repayableLoans[0].person} ({repayableLoans[0].amount} zł)</strong>
                        {repayableLoans.length > 1 && <span> i {repayableLoans.length - 1} innych</span>}
                    </div>
                )}
                <div className="piggy-history">
                    {loans.map(l => (
                        <div key={l.id} className={`piggy-item loan-item ${l.type === 'lent' ? 'lent' : 'borrowed'}`}>
                            <div className="loan-details-left">
                                <span>{format(l.date.toDate(), 'dd.MM')}</span>
                                <strong className="loan-person">{l.person}</strong>
                            </div>
                            <span>{l.description}</span>
                            <strong className={`loan-amount ${l.type === 'lent' ? 'lent' : 'borrowed'}`}>
                                {l.type === 'lent' ? '+' : '-'}{l.amount} zł
                            </strong>
                            <div className="loan-actions">
                                <button onClick={() => handleSettleLoan(l)} className="settle-btn" title="Rozlicz"><Sparkles size={12} /> Rozlicz</button>
                                <button onClick={() => handleDeleteLoan(l.id)} className="delete-mini"><Trash2 size={12} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Piggy Bank Section */}
            <div className="piggy-bank-section">
                <div className="piggy-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h3><PiggyBank size={24} /> Skarbonka</h3>
                        <button className="add-btn-small" onClick={() => setIsPiggyModalOpen(true)} title="Dodaj">
                            <Plus size={18} />
                        </button>
                    </div>
                    <div className="piggy-total">{piggyTotal.toFixed(2)} zł</div>
                </div>
                <div className="piggy-history">
                    {piggyBank.slice(0, 5).map(p => (
                        <div key={p.id} className="piggy-item">
                            <span>{format(p.date.toDate(), 'dd.MM')}</span>
                            <span>{p.description}</span>
                            <strong>+{p.amount} zł</strong>
                            <button onClick={() => handleDeletePiggy(p.id)} className="delete-mini"><Trash2 size={12} /></button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modals */}
            {isTransModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Dodaj transakcję</h2>
                        <form onSubmit={handleAddTransaction}>
                            <div className="toggle-group">
                                <button type="button" className={newTrans.category === 'expense' ? 'active' : ''} onClick={() => setNewTrans({ ...newTrans, category: 'expense' })}>Wydatek</button>
                                <button type="button" className={newTrans.category === 'income' ? 'active' : ''} onClick={() => setNewTrans({ ...newTrans, category: 'income' })}>Przychód</button>
                            </div>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="Kwota"
                                value={newTrans.amount}
                                onChange={e => setNewTrans({ ...newTrans, amount: e.target.value })}
                                required
                            />
                            <input
                                type="text"
                                placeholder="Opis"
                                value={newTrans.description}
                                onChange={e => setNewTrans({ ...newTrans, description: e.target.value })}
                            />
                            <select
                                value={newTrans.type}
                                onChange={e => setNewTrans({ ...newTrans, type: e.target.value })}
                            >
                                <option value="card">Karta</option>
                                <option value="cash">Gotówka</option>
                            </select>

                            {newTrans.category === 'expense' && (
                                <select
                                    value={newTrans.subCategory}
                                    onChange={e => setNewTrans({ ...newTrans, subCategory: e.target.value })}
                                    className="category-select"
                                >
                                    <option>Jedzenie</option>
                                    <option>Transport</option>
                                    <option>Rozrywka</option>
                                    <option>Zakupy</option>
                                    <option>Zdrowie</option>
                                    <option>Rachunki</option>
                                    <option>Inne</option>
                                </select>
                            )}
                            <div className="modal-actions">
                                <button type="button" onClick={() => setIsTransModalOpen(false)}>Anuluj</button>
                                <button type="submit" className="submit-btn">Dodaj</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isPiggyModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Skarbonka</h2>
                        <form onSubmit={handleAddPiggy}>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="Kwota"
                                value={newPiggy.amount}
                                onChange={e => setNewPiggy({ ...newPiggy, amount: e.target.value })}
                                required
                            />
                            <input
                                type="text"
                                placeholder="Cel / Opis"
                                value={newPiggy.description}
                                onChange={e => setNewPiggy({ ...newPiggy, description: e.target.value })}
                            />
                            <div className="modal-actions">
                                <button type="button" onClick={() => setIsPiggyModalOpen(false)}>Anuluj</button>
                                <button type="submit" className="submit-btn">Wrzuć</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isLoanModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Dodaj Pożyczkę / Dług</h2>
                        <form onSubmit={handleAddLoan}>
                            <div className="toggle-group">
                                <button type="button" className={newLoan.type === 'borrowed' ? 'active' : ''} onClick={() => setNewLoan({ ...newLoan, type: 'borrowed' })}>Wiszę komuś</button>
                                <button type="button" className={newLoan.type === 'lent' ? 'active' : ''} onClick={() => setNewLoan({ ...newLoan, type: 'lent' })}>Ktoś wisi mi</button>
                            </div>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="Kwota"
                                value={newLoan.amount}
                                onChange={e => setNewLoan({ ...newLoan, amount: e.target.value })}
                                required
                            />
                            <input
                                type="text"
                                placeholder={newLoan.type === 'borrowed' ? "Komu wiszę?" : "Kto mi wisi?"}
                                value={newLoan.person}
                                onChange={e => setNewLoan({ ...newLoan, person: e.target.value })}
                                required
                            />
                            <input
                                type="text"
                                placeholder="Opis (opcjonalnie)"
                                value={newLoan.description}
                                onChange={e => setNewLoan({ ...newLoan, description: e.target.value })}
                            />
                            <div className="modal-actions">
                                <button type="button" onClick={() => setIsLoanModalOpen(false)}>Anuluj</button>
                                <button type="submit" className="submit-btn">Zapisz</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
