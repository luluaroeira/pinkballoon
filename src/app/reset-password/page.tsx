'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('As senhas não coincidem');
            return;
        }

        if (password.length < 6) {
            setError('A senha deve ter no mínimo 6 caracteres');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error);
            } else {
                setSuccess(true);
            }
        } catch {
            setError('Erro de conexão. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
                <h2 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '1.2rem' }}>
                    Link inválido
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
                    Este link não contém um token válido. Solicite um novo link de redefinição.
                </p>
                <Link href="/" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block', padding: '12px 28px' }}>
                    Voltar ao Login
                </Link>
            </div>
        );
    }

    if (success) {
        return (
            <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
                <h2 className="gradient-text" style={{ marginBottom: '12px', fontSize: '1.4rem', fontWeight: 800 }}>
                    Senha Redefinida!
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem' }}>
                    Sua senha foi alterada com sucesso. Agora faça login com a nova senha.
                </p>
                <Link href="/" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block', padding: '14px 32px' }}>
                    Fazer Login 🎈
                </Link>
            </div>
        );
    }

    return (
        <div className="card" style={{ padding: '32px' }}>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '4px', fontSize: '1.3rem', fontWeight: 700 }}>
                Nova Senha
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
                Digite sua nova senha abaixo.
            </p>

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{
                        display: 'block', color: 'var(--text-secondary)',
                        fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px'
                    }}>
                        Nova Senha
                    </label>
                    <input
                        className="input"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        required
                        minLength={6}
                    />
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <label style={{
                        display: 'block', color: 'var(--text-secondary)',
                        fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px'
                    }}>
                        Confirmar Nova Senha
                    </label>
                    <input
                        className="input"
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Repita a nova senha"
                        required
                        minLength={6}
                    />
                    {password && confirmPassword && password !== confirmPassword && (
                        <p style={{ fontSize: '0.8rem', color: '#f87171', marginTop: '6px' }}>
                            ⚠️ As senhas não coincidem
                        </p>
                    )}
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

                <button
                    className="btn-primary"
                    type="submit"
                    disabled={loading || (password !== confirmPassword)}
                    style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
                >
                    {loading ? 'Redefinindo...' : 'Redefinir Senha 🔑'}
                </button>
            </form>
        </div>
    );
}

export default function ResetPasswordPage() {
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

            <div className="animate-fade-in" style={{ maxWidth: '440px', width: '100%' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div className="animate-balloon" style={{ fontSize: '3rem', marginBottom: '8px' }}>🎈</div>
                    <h1 className="gradient-text" style={{ fontSize: '1.8rem', fontWeight: 800 }}>
                        PinkBalloon
                    </h1>
                </div>

                <Suspense fallback={
                    <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
                        <div className="animate-balloon" style={{ fontSize: '2rem' }}>🎈</div>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>Carregando...</p>
                    </div>
                }>
                    <ResetPasswordForm />
                </Suspense>
            </div>
        </div>
    );
}
