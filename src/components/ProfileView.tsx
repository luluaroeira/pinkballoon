'use client';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export default function ProfileView() {
    const { user, refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

    // Profile form
    const [name, setName] = useState(user?.name || '');
    const [cfHandle, setCfHandle] = useState(user?.codeforcesHandle || '');
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileMsg, setProfileMsg] = useState('');
    const [profileError, setProfileError] = useState('');

    // Password form
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passLoading, setPassLoading] = useState(false);
    const [passMsg, setPassMsg] = useState('');
    const [passError, setPassError] = useState('');

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileLoading(true);
        setProfileMsg('');
        setProfileError('');

        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, codeforcesHandle: cfHandle }),
            });
            const data = await res.json();
            if (!res.ok) {
                setProfileError(data.error);
            } else {
                setProfileMsg(data.message || 'Perfil atualizado!');
                refreshUser();
            }
        } catch {
            setProfileError('Erro de conexão');
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPassLoading(true);
        setPassMsg('');
        setPassError('');

        if (newPassword !== confirmPassword) {
            setPassError('As senhas não coincidem');
            setPassLoading(false);
            return;
        }

        if (newPassword.length < 6) {
            setPassError('A nova senha deve ter no mínimo 6 caracteres');
            setPassLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/profile/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await res.json();
            if (!res.ok) {
                setPassError(data.error);
            } else {
                setPassMsg(data.message || 'Senha alterada!');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch {
            setPassError('Erro de conexão');
        } finally {
            setPassLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="page-container animate-fade-in">
            {/* Background blobs */}
            <div className="bg-blob" style={{
                width: '400px', height: '400px',
                background: 'radial-gradient(circle, rgba(236,72,153,0.15), transparent)',
                top: '100px', right: '-100px',
            }} />

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{
                    width: '72px', height: '72px',
                    borderRadius: '50%',
                    background: 'var(--accent-gradient)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.8rem', fontWeight: 800,
                    margin: '0 auto 16px',
                    boxShadow: '0 4px 24px var(--glow-pink)',
                }}>
                    {user.name.charAt(0).toUpperCase()}
                </div>
                <h1 className="gradient-text" style={{ fontSize: '1.8rem', fontWeight: 800 }}>
                    Meu Perfil
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.9rem' }}>
                    {user.email}
                </p>
            </div>

            {/* Tabs */}
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                <div className="tab-group" style={{ marginBottom: '24px' }}>
                    <button
                        className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                        style={{ flex: 1 }}
                    >
                        👤 Dados Pessoais
                    </button>
                    <button
                        className={`tab ${activeTab === 'password' ? 'active' : ''}`}
                        onClick={() => setActiveTab('password')}
                        style={{ flex: 1 }}
                    >
                        🔒 Alterar Senha
                    </button>
                </div>

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <div className="card animate-fade-in">
                        <form onSubmit={handleProfileUpdate}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    display: 'block', color: 'var(--text-secondary)',
                                    fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px'
                                }}>
                                    Nome ou Nickname
                                </label>
                                <input
                                    className="input"
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Seu nome"
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    display: 'block', color: 'var(--text-secondary)',
                                    fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px'
                                }}>
                                    Email
                                </label>
                                <input
                                    className="input"
                                    type="email"
                                    value={user.email}
                                    disabled
                                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                                />
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    O email não pode ser alterado
                                </p>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{
                                    display: 'block', color: 'var(--text-secondary)',
                                    fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px'
                                }}>
                                    Handle do Codeforces
                                </label>
                                <input
                                    className="input"
                                    type="text"
                                    value={cfHandle}
                                    onChange={e => setCfHandle(e.target.value)}
                                    placeholder="Seu handle no CF"
                                    required
                                />
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    Será revalidado na API do Codeforces
                                </p>
                            </div>

                            {profileError && (
                                <div style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '10px', padding: '12px 16px',
                                    marginBottom: '16px', color: '#f87171', fontSize: '0.9rem',
                                }}>
                                    ⚠️ {profileError}
                                </div>
                            )}

                            {profileMsg && (
                                <div style={{
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    borderRadius: '10px', padding: '12px 16px',
                                    marginBottom: '16px', color: '#4ade80', fontSize: '0.9rem',
                                }}>
                                    ✅ {profileMsg}
                                </div>
                            )}

                            <button
                                className="btn-primary"
                                type="submit"
                                disabled={profileLoading}
                                style={{ width: '100%', padding: '14px' }}
                            >
                                {profileLoading ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Password Tab */}
                {activeTab === 'password' && (
                    <div className="card animate-fade-in">
                        <form onSubmit={handlePasswordChange}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    display: 'block', color: 'var(--text-secondary)',
                                    fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px'
                                }}>
                                    Senha Atual
                                </label>
                                <input
                                    className="input"
                                    type="password"
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    placeholder="••••••"
                                    required
                                />
                            </div>

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
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
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
                                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                                    <p style={{ fontSize: '0.8rem', color: '#f87171', marginTop: '6px' }}>
                                        ⚠️ As senhas não coincidem
                                    </p>
                                )}
                            </div>

                            {passError && (
                                <div style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '10px', padding: '12px 16px',
                                    marginBottom: '16px', color: '#f87171', fontSize: '0.9rem',
                                }}>
                                    ⚠️ {passError}
                                </div>
                            )}

                            {passMsg && (
                                <div style={{
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    borderRadius: '10px', padding: '12px 16px',
                                    marginBottom: '16px', color: '#4ade80', fontSize: '0.9rem',
                                }}>
                                    ✅ {passMsg}
                                </div>
                            )}

                            <button
                                className="btn-primary"
                                type="submit"
                                disabled={passLoading || (newPassword !== confirmPassword)}
                                style={{ width: '100%', padding: '14px' }}
                            >
                                {passLoading ? 'Alterando...' : 'Alterar Senha 🔒'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
