import { useState } from 'react';
import { auth } from '../firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
} from 'firebase/auth';
import { LogIn, UserPlus, Mail, Lock, Cat } from 'lucide-react';

export default function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            console.error(err);
            setError('Błąd: ' + (err.message.includes('auth/invalid-credential') ? 'Błędne dane logowania' : err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card modal-content">
                <div className="auth-header">
                    <div className="auth-logo">
                        <Cat size={40} className="paw-icon" />
                    </div>
                    <h2>{isLogin ? 'Witaj ponowie! 🐾' : 'Dołącz do nas! 💎'}</h2>
                    <p>{isLogin ? 'Zaloguj się, aby zsynchronizować dane' : 'Stwórz konto, aby mieć dostęp wszędzie'}</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <div className="input-with-icon">
                            <Mail size={18} />
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <div className="input-with-icon">
                            <Lock size={18} />
                            <input
                                type="password"
                                placeholder="Hasło"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <button type="submit" className="submit-btn auth-submit" disabled={loading}>
                        {loading ? (
                            <span className="loader">🐾</span>
                        ) : (
                            isLogin ? <><LogIn size={18} /> Zaloguj się</> : <><UserPlus size={18} /> Zarejestruj się</>
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <button onClick={() => setIsLogin(!isLogin)} className="toggle-auth">
                        {isLogin ? 'Nie masz konta? Zarejestruj się 💎' : 'Masz już konto? Zaloguj się 🐾'}
                    </button>
                </div>
            </div>
        </div>
    );
}
