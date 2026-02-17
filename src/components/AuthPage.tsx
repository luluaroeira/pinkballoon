'use client';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthPage() {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const { login, register } = useAuth();

    // Form fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [cfHandle, setCfHandle] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        if (mode === 'forgot') {
            try {
                const res = await fetch('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });
                const data = await res.json();
                if (!res.ok) {
                    setError(data.error);
                } else {
                    setSuccessMsg(data.message);
                }
            } catch {
                setError('Erro de conexão. Tente novamente.');
            }
            setLoading(false);
            return;
        }

        let result;
        if (mode === 'login') {
            result = await login(email, password);
        } else {
            result = await register({ name, email, password, codeforcesHandle: cfHandle });
        }

        if (result.error) {
            setError(result.error);
        }
        setLoading(false);
    };

    const switchMode = (newMode: 'login' | 'register' | 'forgot') => {
        setMode(newMode);
        setError('');
        setSuccessMsg('');
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Background blobs */}
            <div className="bg-blob" style={{
                width: '600px', height: '600px',
                background: 'radial-gradient(circle, rgba(236,72,153,0.3), transparent)',
                top: '-200px', right: '-200px',
            }} />
            <div className="bg-blob" style={{
                width: '500px', height: '500px',
                background: 'radial-gradient(circle, rgba(168,85,247,0.2), transparent)',
                bottom: '-150px', left: '-150px',
            }} />

            <div className="animate-fade-in" style={{
                maxWidth: '440px',
                width: '100%',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div className="animate-balloon" style={{
                        fontSize: '4rem',
                        marginBottom: '8px',
                    }}>🎈</div>
                    <h1 className="gradient-text" style={{
                        fontSize: '2.2rem',
                        fontWeight: 800,
                        letterSpacing: '-0.02em',
                    }}>
                        PinkBalloon
                    </h1>
                    <p style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.95rem',
                        marginTop: '8px',
                    }}>
                        Turma das Maratonistas TM
                    </p>
                </div>

                {/* Auth card */}
                <div className="card" style={{ padding: '32px' }}>

                    {/* Forgot Password Mode */}
                    {mode === 'forgot' ? (
                        <>
                            <div style={{ marginBottom: '24px' }}>
                                <h2 style={{
                                    color: 'var(--text-primary)',
                                    fontSize: '1.2rem',
                                    fontWeight: 700,
                                    marginBottom: '8px',
                                }}>
                                    🔑 Esqueci minha senha
                                </h2>
                                <p style={{
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.9rem',
                                    lineHeight: 1.5,
                                }}>
                                    Digite seu email e enviaremos um link para redefinir sua senha.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px' }}>
                                        Email
                                    </label>
                                    <input
                                        className="input"
                                        type="email"
                                        placeholder="seu@email.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                {error && (
                                    <div style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: '10px', padding: '12px 16px',
                                        marginBottom: '16px', color: '#f87171', fontSize: '0.9rem',
                                    }}>
                                        ⚠️ {error}
                                    </div>
                                )}

                                {successMsg && (
                                    <div style={{
                                        background: 'rgba(34, 197, 94, 0.1)',
                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                        borderRadius: '10px', padding: '12px 16px',
                                        marginBottom: '16px', color: '#4ade80', fontSize: '0.9rem',
                                        lineHeight: 1.5,
                                    }}>
                                        📧 {successMsg}
                                    </div>
                                )}

                                <button
                                    className="btn-primary"
                                    type="submit"
                                    disabled={loading}
                                    style={{ width: '100%', padding: '14px', fontSize: '1rem', marginBottom: '16px' }}
                                >
                                    {loading ? 'Enviando...' : 'Enviar Link de Redefinição'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => switchMode('login')}
                                    style={{
                                        width: '100%',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--pink-400)',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        fontWeight: 500,
                                        padding: '8px',
                                    }}
                                >
                                    ← Voltar ao Login
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            {/* Login/Register Tabs */}
                            <div className="tab-group" style={{ marginBottom: '24px' }}>
                                <button
                                    className={`tab ${mode === 'login' ? 'active' : ''}`}
                                    onClick={() => switchMode('login')}
                                    style={{ flex: 1 }}
                                >
                                    Entrar
                                </button>
                                <button
                                    className={`tab ${mode === 'register' ? 'active' : ''}`}
                                    onClick={() => switchMode('register')}
                                    style={{ flex: 1 }}
                                >
                                    Cadastrar
                                </button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                {mode === 'register' && (
                                    <>
                                        <div style={{ marginBottom: '16px' }}>
                                            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px' }}>
                                                Nome ou Nickname
                                            </label>
                                            <input
                                                className="input"
                                                type="text"
                                                placeholder="Como quer ser chamada?"
                                                value={name}
                                                onChange={e => setName(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div style={{ marginBottom: '16px' }}>
                                            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px' }}>
                                                Handle do Codeforces
                                            </label>
                                            <input
                                                className="input"
                                                type="text"
                                                placeholder="Seu handle no CF (ex: tourist)"
                                                value={cfHandle}
                                                onChange={e => setCfHandle(e.target.value)}
                                                required
                                            />
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                Será validado automaticamente na API do Codeforces
                                            </p>
                                        </div>
                                    </>
                                )}

                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px' }}>
                                        Email
                                    </label>
                                    <input
                                        className="input"
                                        type="email"
                                        placeholder="seu@email.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                <div style={{ marginBottom: mode === 'login' ? '12px' : '24px' }}>
                                    <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px' }}>
                                        Senha
                                    </label>
                                    <input
                                        className="input"
                                        type="password"
                                        placeholder={mode === 'login' ? '••••••' : 'Mínimo 6 caracteres'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                    />
                                </div>

                                {/* Forgot password link - only on login */}
                                {mode === 'login' && (
                                    <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                                        <button
                                            type="button"
                                            onClick={() => switchMode('forgot')}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'var(--pink-400)',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem',
                                                fontWeight: 500,
                                                padding: '0',
                                                textDecoration: 'none',
                                            }}
                                        >
                                            Esqueci minha senha
                                        </button>
                                    </div>
                                )}

                                {error && (
                                    <div style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: '10px',
                                        padding: '12px 16px',
                                        marginBottom: '16px',
                                        color: '#f87171',
                                        fontSize: '0.9rem',
                                    }}>
                                        ⚠️ {error}
                                    </div>
                                )}

                                <button
                                    className="btn-primary"
                                    type="submit"
                                    disabled={loading}
                                    style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
                                >
                                    {loading ? (
                                        <span>
                                            {mode === 'login' ? 'Entrando...' : 'Validando handle e criando conta...'}
                                        </span>
                                    ) : (
                                        <span>
                                            {mode === 'login' ? 'Entrar 🎈' : 'Criar Conta 🎈'}
                                        </span>
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                <p style={{
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    marginTop: '24px',
                }}>
                    Constância é a chave. Bora evoluir juntas! 💪
                </p>
            </div>
        </div>
    );
}
