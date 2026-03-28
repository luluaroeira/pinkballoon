'use client';
import { useState, useEffect, useCallback } from 'react';

interface Exercise {
    id: number;
    type: string;
    contestId: number;
    problemIndex: string;
    title: string | null;
    description: string | null;
    points: number;
    publishedAt: string;
    expiresAt: string | null;
    completions: {
        user: { name: string; codeforcesHandle: string };
        id: number;
    }[];
}

interface Announcement {
    id: number;
    content: string;
    createdAt: string;
}

interface AdminUser {
    id: number;
    name: string;
    email: string;
    codeforcesHandle: string;
    role: string;
    createdAt: string;
    completions: { id: number; pointsAwarded: number }[];
    periodPoints: number;
    periodCompletionsCount: number;
    totalPoints: number;
    totalCompletionsCount: number;
}

interface ScoringPeriod {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
}

export default function AdminView() {
    const [activeTab, setActiveTab] = useState<'exercises' | 'announcements' | 'users' | 'checker' | 'periods'>('exercises');
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [periods, setPeriods] = useState<ScoringPeriod[]>([]);
    const [loading, setLoading] = useState(true);
    const [activePeriodName, setActivePeriodName] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    // Exercise form
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState({
        type: 'daily',
        contestId: '',
        problemIndex: '',
        title: '',
        description: '',
        points: '3', // Default daily
        publishedAt: '',
        publishedTime: '07:00',
    });

    // Period form
    const [showPeriodForm, setShowPeriodForm] = useState(false);
    const [periodForm, setPeriodForm] = useState({
        name: '',
        startDate: '',
        endDate: ''
    });

    // Convert DD/MM + HH:MM to ISO for API
    const ddmmToISO = (ddmm: string, time: string): string => {
        const match = ddmm.match(/^(\d{2})\/(\d{2})$/);
        if (!match) return '';
        const [, day, month] = match;
        const year = new Date().getFullYear();
        return `${year}-${month}-${day}T${time || '07:00'}`;
    };

    // Convert ISO/Date to DD/MM
    const isoToDDMM = (iso: string): string => {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    const fetchNextDate = async (type: string) => {
        try {
            const res = await fetch(`/api/admin/exercises/next-date?type=${type}`);
            const data = await res.json();
            if (data.nextDate) {
                setForm(prev => ({ ...prev, publishedAt: isoToDDMM(data.nextDate) }));
            }
        } catch (err) {
            console.error('Error fetching next date:', err);
        }
    };

    // Preview state
    const [preview, setPreview] = useState<{ loading: boolean; name?: string; error?: string } | null>(null);

    // Debounce fetch preview
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!form.contestId || !form.problemIndex) {
                setPreview(null);
                return;
            }

            setPreview({ loading: true });
            try {
                const res = await fetch(`/api/admin/exercises/preview?contestId=${form.contestId}&index=${form.problemIndex}`);
                const data = await res.json();
                if (data.name) {
                    setPreview({ loading: false, name: data.name });
                } else {
                    setPreview({ loading: false, error: 'Exercício não encontrado :(' });
                }
            } catch {
                setPreview({ loading: false, error: 'Erro ao verificar' });
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [form.contestId, form.problemIndex]);

    // Announcement form
    const [annContent, setAnnContent] = useState('');

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [exRes, annRes, usrRes, perRes] = await Promise.all([
                fetch('/api/admin/exercises'),
                fetch('/api/admin/announcements'),
                fetch('/api/admin/users'),
                fetch('/api/admin/periods'),
            ]);
            const [exData, annData, usrData, perData] = await Promise.all([
                exRes.json(), annRes.json(), usrRes.json(), perRes.json()
            ]);
            setExercises(exData.exercises || []);
            setAnnouncements(annData.announcements || []);
            setUsers(usrData.users || []);
            setActivePeriodName(usrData.activePeriod?.name || null);
            setPeriods(Array.isArray(perData) ? perData : []);
        } catch (err) {
            console.error('Admin fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const resetForm = () => {
        setForm({ type: 'daily', contestId: '', problemIndex: '', title: '', description: '', points: '3', publishedAt: '', publishedTime: '07:00' });
        setEditingId(null);
        setShowForm(false);
        setPreview(null);
    };

    const openNewExerciseForm = async () => {
        resetForm();
        setShowForm(true);
        // Auto-fill with next free date
        await fetchNextDate('daily');
    };

    const handleExerciseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate DD/MM format
        if (form.publishedAt && !form.publishedAt.match(/^\d{2}\/\d{2}$/)) {
            showToast('Data deve estar no formato DD/MM', 'error');
            return;
        }

        try {
            const url = editingId ? `/api/admin/exercises/${editingId}` : '/api/admin/exercises';
            const method = editingId ? 'PUT' : 'POST';
            // Convert DD/MM + time to ISO before sending
            const payload = {
                ...form,
                publishedAt: form.publishedAt ? ddmmToISO(form.publishedAt, form.publishedTime) : '',
            };
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                showToast(data.error || 'Erro', 'error');
                return;
            }
            showToast(data.message || 'Sucesso!', 'success');
            resetForm();
            fetchAll();
        } catch {
            showToast('Erro de conexão', 'error');
        }
    };

    const handleRunCheck = async () => {
        try {
            const res = await fetch('/api/checker', { method: 'POST' });
            if (res.ok) {
                showToast('Verificação iniciada! Os pontos aparecerão em breve. ⏳', 'success');
            } else {
                showToast('Erro ao iniciar verificação', 'error');
            }
        } catch {
            showToast('Erro de conexão', 'error');
        }
    };

    const handleDeleteExercise = async (id: number) => {
        if (!confirm('Tem certeza que deseja remover este exercício?')) return;
        try {
            const res = await fetch(`/api/admin/exercises/${id}`, { method: 'DELETE' });
            const data = await res.json();
            showToast(data.message || 'Removido!', 'success');
            fetchAll();
        } catch {
            showToast('Erro ao remover', 'error');
        }
    };

    const handleEditExercise = (ex: Exercise) => {
        const d = ex.publishedAt ? new Date(ex.publishedAt) : null;
        setForm({
            type: ex.type,
            contestId: String(ex.contestId),
            problemIndex: ex.problemIndex,
            title: ex.title || '',
            description: ex.description || '',
            points: String(ex.points),
            publishedAt: ex.publishedAt ? isoToDDMM(ex.publishedAt) : '',
            publishedTime: d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '07:00',
        });
        setEditingId(ex.id);
        setShowForm(true);
    };

    const handleCreateAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!annContent.trim()) return;
        try {
            const res = await fetch('/api/admin/announcements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: annContent }),
            });
            const data = await res.json();
            if (!res.ok) {
                showToast(data.error || 'Erro', 'error');
                return;
            }
            showToast(data.message || 'Publicado!', 'success');
            setAnnContent('');
            fetchAll();
        } catch {
            showToast('Erro de conexão', 'error');
        }
    };

    const handleDeleteAnnouncement = async (id: number) => {
        try {
            await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' });
            showToast('Aviso removido!', 'success');
            fetchAll();
        } catch {
            showToast('Erro ao remover', 'error');
        }
    };

    const handleRunChecker = async () => {
        showToast('Executando verificação...', 'success');
        try {
            const res = await fetch('/api/checker', { method: 'POST' });
            const data = await res.json();
            showToast(data.message || data.error || 'Concluído!', res.ok ? 'success' : 'error');
            fetchAll();
        } catch {
            showToast('Erro ao executar verificação', 'error');
        }
    };

    // --- PERIODS LOGIC ---
    // Convert DD/MM/AAAA to ISO date string
    const ddmmyyyyToISO = (ddmmyyyy: string): string => {
        const match = ddmmyyyy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!match) return '';
        const [, day, month, year] = match;
        return `${year}-${month}-${day}`;
    };

    // Auto-format date input with slashes
    const handleDateMask = (value: string, prev: string): string => {
        let val = value.replace(/[^0-9/]/g, '');
        if (val.length === 2 && !val.includes('/') && prev.length < val.length) val += '/';
        if (val.length === 5 && val.charAt(2) === '/' && val.indexOf('/', 3) === -1 && prev.length < val.length) val += '/';
        return val;
    };

    const handlePeriodSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate DD/MM/AAAA
        if (!periodForm.startDate.match(/^\d{2}\/\d{2}\/\d{4}$/) || !periodForm.endDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            showToast('Datas devem estar no formato DD/MM/AAAA', 'error');
            return;
        }

        const payload = {
            name: periodForm.name,
            startDate: ddmmyyyyToISO(periodForm.startDate),
            endDate: ddmmyyyyToISO(periodForm.endDate),
        };

        try {
            const res = await fetch('/api/admin/periods', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Período criado! Ative-o na lista abaixo.', 'success');
                setPeriodForm({ name: '', startDate: '', endDate: '' });
                setShowPeriodForm(false);
                fetchAll();
            } else {
                showToast(data.error || 'Erro ao criar', 'error');
            }
        } catch {
            showToast('Erro de conexão', 'error');
        }
    };

    const handleActivatePeriod = async (id: number) => {
        try {
            const res = await fetch(`/api/admin/periods/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: true }),
            });
            if (res.ok) {
                showToast('Período ativado com sucesso! 🏆', 'success');
                fetchAll();
            } else {
                showToast('Erro ao ativar', 'error');
            }
        } catch {
            showToast('Erro de conexão', 'error');
        }
    };

    const handleDeletePeriod = async (id: number) => {
        if (!confirm('Tem certeza? Isso pode afetar o cálculo de pontos se houver histórico.')) return;
        try {
            await fetch(`/api/admin/periods/${id}`, { method: 'DELETE' });
            showToast('Período excluído.', 'success');
            fetchAll();
        } catch {
            showToast('Erro ao excluir', 'error');
        }
    };


    const tabs = [
        { key: 'periods', label: 'Períodos', icon: '📅' },
        { key: 'exercises', label: 'Exercícios', icon: '📝' },
        { key: 'announcements', label: 'Avisos', icon: '📢' },
        { key: 'users', label: 'Usuárias', icon: '👥' },
        { key: 'checker', label: 'Verificador', icon: '🔄' },
    ];

    return (
        <div className="page-container">
            <div className="bg-blob" style={{
                width: '400px', height: '400px',
                background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent)',
                top: '100px', left: '-150px',
            }} />

            <div className="animate-fade-in">
                <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                            <span>⚙️</span>
                            <span className="gradient-text">Painel Admin</span>
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Gerencie períodos, exercícios e avisos.
                        </p>
                    </div>
                    <button className="btn-secondary" onClick={handleRunCheck}>
                        🔄 Forçar Verificação
                    </button>
                </div>

                {/* Tabs */}
                <div className="tab-group" style={{ marginBottom: '24px', flexWrap: 'wrap' }}>
                    {tabs.map(t => (
                        <button
                            key={t.key}
                            className={`tab ${activeTab === t.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(t.key as any)}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {[1, 2, 3].map(i => <div key={i} className="loading-pulse" style={{ height: '80px' }} />)}
                    </div>
                ) : (
                    <>
                        {/* PERIODS TAB */}
                        {activeTab === 'periods' && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Período de Pontuação Ativo</h2>
                                    <button className="btn-primary" onClick={() => setShowPeriodForm(!showPeriodForm)}>
                                        {showPeriodForm ? 'Cancelar' : '+ Novo Período'}
                                    </button>
                                </div>

                                {showPeriodForm && (
                                    <div className="card" style={{ marginBottom: '20px' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Criar Novo Período (Season)</h3>
                                        <form onSubmit={handlePeriodSubmit}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Nome (Ex: Março 2026)</label>
                                                    <input className="input" type="text" value={periodForm.name} onChange={e => setPeriodForm({ ...periodForm, name: e.target.value })} required />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>📅 Início</label>
                                                    <input className="input" type="text" placeholder="DD/MM/AAAA" maxLength={10} value={periodForm.startDate} onChange={e => setPeriodForm({ ...periodForm, startDate: handleDateMask(e.target.value, periodForm.startDate) })} required />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>📅 Fim</label>
                                                    <input className="input" type="text" placeholder="DD/MM/AAAA" maxLength={10} value={periodForm.endDate} onChange={e => setPeriodForm({ ...periodForm, endDate: handleDateMask(e.target.value, periodForm.endDate) })} required />
                                                </div>
                                            </div>
                                            <button className="btn-primary" type="submit" style={{ marginTop: '12px' }}>Salvar Período</button>
                                        </form>
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {periods.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                            <p>Nenhum período criado. Crie um para começar a contar pontos!</p>
                                        </div>
                                    )}
                                    {periods.map(p => (
                                        <div key={p.id} className={`card ${p.isActive ? 'active-period-card' : ''}`} style={{
                                            borderLeft: p.isActive ? '4px solid var(--green-500)' : '4px solid transparent',
                                            padding: '16px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{p.name}</span>
                                                        {p.isActive && (
                                                            <span className={`badge ${new Date() > new Date(new Date(p.endDate).setHours(23, 59, 59)) ? 'badge-warning' : 'badge-success'}`}>
                                                                {new Date() > new Date(new Date(p.endDate).setHours(23, 59, 59)) ? 'ENCERRADO (Visível no Ranking)' : 'ATIVO AGORA (Ranking)'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                        📅 {new Date(p.startDate).toLocaleDateString('pt-BR')} até {new Date(p.endDate).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    {!p.isActive && (
                                                        <button className="btn-secondary" onClick={() => handleActivatePeriod(p.id)}>
                                                            ✅ Ativar
                                                        </button>
                                                    )}
                                                    <button className="btn-danger" onClick={() => handleDeletePeriod(p.id)}>
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* EXERCISES TAB */}
                        {activeTab === 'exercises' && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                                        {exercises.length} exercício{exercises.length !== 1 ? 's' : ''}
                                    </h2>
                                    <button className="btn-primary" onClick={openNewExerciseForm}>
                                        + Novo Exercício
                                    </button>
                                </div>

                                {showForm && (
                                    <>
                                        {/* Backdrop */}
                                        <div onClick={resetForm} style={{
                                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                                            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                                            zIndex: 9998,
                                        }} />
                                        {/* Modal */}
                                        <div style={{
                                            position: 'fixed', top: '120px', left: '50%',
                                            transform: 'translateX(-50%)',
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--card-border)',
                                            borderRadius: '20px', padding: '24px',
                                            width: '90%', maxWidth: '500px',
                                            maxHeight: 'calc(100vh - 140px)', overflowY: 'auto',
                                            zIndex: 9999,
                                            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                                        }}>
                                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px' }}>
                                                {editingId ? 'Editar Exercício' : 'Novo Exercício'} 🎈
                                            </h3>
                                            <form onSubmit={handleExerciseSubmit}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                                    <div>
                                                        <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>Tipo</label>
                                                        <select className="select" value={form.type} onChange={e => {
                                                            const newType = e.target.value;
                                                            const newPoints = newType === 'weekly' ? '5' : '3';
                                                            setForm({ ...form, type: newType, points: newPoints });
                                                            if (!editingId) fetchNextDate(newType);
                                                        }}>
                                                            <option value="daily">Diário</option>
                                                            <option value="weekly">Semanal</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>Pontos</label>
                                                        <input className="input" type="number" min="1" value={form.points} onChange={e => setForm({ ...form, points: e.target.value })} required />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                                    <div>
                                                        <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>Contest ID (CF)</label>
                                                        <input className="input" type="number" placeholder="Ex: 1900" value={form.contestId} onChange={e => setForm({ ...form, contestId: e.target.value })} required />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>Problem Index</label>
                                                        <input className="input" type="text" placeholder="Ex: A, B, C" value={form.problemIndex} onChange={e => setForm({ ...form, problemIndex: e.target.value })} required />
                                                    </div>
                                                </div>

                                                {/* Preview Section */}
                                                {preview && (
                                                    <div style={{
                                                        marginBottom: '16px', padding: '10px', borderRadius: '8px',
                                                        background: preview.error ? 'rgba(236, 72, 153, 0.1)' : 'rgba(74, 222, 128, 0.1)',
                                                        border: `1px solid ${preview.error ? 'var(--pink-500)' : 'var(--green-500)'}`,
                                                        fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px'
                                                    }}>
                                                        {preview.loading ? (
                                                            <span style={{ color: 'var(--text-secondary)' }}>⏳ Verificando no Codeforces...</span>
                                                        ) : preview.error ? (
                                                            <span style={{ color: 'var(--pink-400)' }}>❌ {preview.error}</span>
                                                        ) : (
                                                            <span style={{ color: 'var(--green-400)', fontWeight: 600 }}>
                                                                ✅ Encontrado: {preview.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                <div style={{ marginBottom: '12px' }}>
                                                    <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>Título (opcional)</label>
                                                    <input className="input" type="text" placeholder="Ex: Foco em implementação" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                                                </div>
                                                <div style={{ marginBottom: '12px' }}>
                                                    <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>Descrição (opcional)</label>
                                                    <input className="input" type="text" placeholder="Tags: greedy, dp..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                                    <div>
                                                        <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>📅 Data</label>
                                                        <input className="input" type="text" placeholder="DD/MM" maxLength={5} value={form.publishedAt} onChange={e => {
                                                            let val = e.target.value.replace(/[^0-9/]/g, '');
                                                            if (val.length === 2 && !val.includes('/') && form.publishedAt.length < val.length) {
                                                                val = val + '/';
                                                            }
                                                            setForm({ ...form, publishedAt: val });
                                                        }} />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>🕐 Horário</label>
                                                        <input className="input" type="time" value={form.publishedTime} onChange={e => setForm({ ...form, publishedTime: e.target.value })} />
                                                    </div>
                                                </div>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--pink-400)', marginBottom: '4px' }}>
                                                    ⏱️ Expira automaticamente: {form.type === 'daily' ? '24 horas' : '7 dias'} após a data
                                                </p>
                                                {!editingId && form.publishedAt && (
                                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                                                        💡 Próximo dia livre preenchido automaticamente (editável)
                                                    </p>
                                                )}
                                                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                                    <button className="btn-primary" type="submit" style={{ flex: 1 }}>
                                                        {editingId ? 'Salvar Alterações' : 'Criar Exercício'} 🎈
                                                    </button>
                                                    <button className="btn-secondary" type="button" onClick={resetForm}>
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </>
                                )}

                                {/* Exercise list */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {exercises.map(ex => (
                                        <div key={ex.id} className="card" style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                        <span className={`badge ${ex.type === 'daily' ? 'badge-daily' : 'badge-weekly'}`}>
                                                            {ex.type === 'daily' ? 'Diário' : 'Semanal'}
                                                        </span>
                                                        <span className="badge badge-points">{ex.points} pt{ex.points > 1 ? 's' : ''}</span>
                                                    </div>
                                                    <h4 style={{ fontWeight: 600, marginBottom: '4px' }}>
                                                        {ex.title || `CF ${ex.contestId}${ex.problemIndex}`}
                                                    </h4>
                                                    {ex.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ex.description}</p>}
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                        Publicado: {new Date(ex.publishedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                        {ex.expiresAt && ` • Expira: ${new Date(ex.expiresAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`}
                                                    </p>
                                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                        ✅ {ex.completions.length} conclus{ex.completions.length !== 1 ? 'ões' : 'ão'}
                                                        {ex.completions.length > 0 && (
                                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                                                {' '}({ex.completions.map(c => c.user.codeforcesHandle).join(', ')})
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleEditExercise(ex)}>
                                                        ✏️ Editar
                                                    </button>
                                                    <button className="btn-danger" onClick={() => handleDeleteExercise(ex.id)}>
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {exercises.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                            <p>Nenhum exercício criado.</p>
                                            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Clique em &quot;+ Novo Exercício&quot; para começar!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ANNOUNCEMENTS TAB */}
                        {activeTab === 'announcements' && (
                            <div>
                                <div className="card" style={{ marginBottom: '20px' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Novo Aviso</h3>
                                    <form onSubmit={handleCreateAnnouncement}>
                                        <textarea
                                            className="input"
                                            placeholder="Escreva seu aviso para as meninas... 🎈"
                                            value={annContent}
                                            onChange={e => setAnnContent(e.target.value)}
                                            rows={3}
                                            style={{ resize: 'vertical', minHeight: '80px' }}
                                            required
                                        />
                                        <button className="btn-primary" type="submit" style={{ marginTop: '12px' }}>
                                            Publicar Aviso 📢
                                        </button>
                                    </form>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {announcements.map(ann => (
                                        <div key={ann.id} className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                            <div>
                                                <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{ann.content}</p>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                                                    {new Date(ann.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                </p>
                                            </div>
                                            <button className="btn-danger" onClick={() => handleDeleteAnnouncement(ann.id)} style={{ flexShrink: 0 }}>
                                                🗑️
                                            </button>
                                        </div>
                                    ))}
                                    {announcements.length === 0 && (
                                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Nenhum aviso publicado.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* USERS TAB */}
                        {activeTab === 'users' && (
                            <div>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>
                                    {users.length} usuária{users.length !== 1 ? 's' : ''} cadastrada{users.length !== 1 ? 's' : ''}
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {users.map(u => {
                                        const isAdmin = u.role === 'admin';
                                        return (
                                            <div key={u.id} className="card" style={{ padding: '16px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                                    <div style={{ flex: 1, minWidth: '200px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                            <span style={{ fontWeight: 600 }}>{u.name}</span>
                                                            {isAdmin && <span className="badge badge-weekly">Admin</span>}
                                                        </div>
                                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                            {u.email} • CF: <a href={`https://codeforces.com/profile/${u.codeforcesHandle}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--purple-400)' }}>{u.codeforcesHandle}</a>
                                                        </p>
                                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                            Desde {new Date(u.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                        </p>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <span className="gradient-text" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                                                                {u.periodPoints}
                                                            </span>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>pts</span>
                                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                {u.periodCompletionsCount} exercício{u.periodCompletionsCount !== 1 ? 's' : ''}
                                                            </p>
                                                            {u.totalPoints !== u.periodPoints && (
                                                                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                                    Total geral: {u.totalPoints} pts
                                                                </p>
                                                            )}
                                                        </div>
                                                        {!isAdmin && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                <button
                                                                    className="btn-secondary"
                                                                    style={{ padding: '6px 12px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                                                    onClick={async () => {
                                                                        if (!confirm(`Tem certeza que deseja ZERAR os pontos de ${u.name}?\n\nIsso vai remover todas as ${u.totalCompletionsCount} conclusões e ${u.totalPoints} pontos (total geral).`)) return;
                                                                        try {
                                                                            const res = await fetch(`/api/admin/users/${u.id}`, {
                                                                                method: 'PUT',
                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                body: JSON.stringify({ action: 'reset-points' }),
                                                                            });
                                                                            const data = await res.json();
                                                                            showToast(data.message || data.error, res.ok ? 'success' : 'error');
                                                                            if (res.ok) fetchAll();
                                                                        } catch {
                                                                            showToast('Erro de conexão', 'error');
                                                                        }
                                                                    }}
                                                                    disabled={u.totalCompletionsCount === 0}
                                                                    title={u.totalCompletionsCount === 0 ? 'Nenhum ponto para zerar' : `Zerar ${u.totalPoints} pontos (total geral)`}
                                                                >
                                                                    🔄 Zerar Pontos
                                                                </button>
                                                                <button
                                                                    className="btn-danger"
                                                                    style={{ padding: '6px 12px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                                                    onClick={async () => {
                                                                        if (!confirm(`⚠️ ATENÇÃO!\n\nVocê está prestes a EXCLUIR a conta de ${u.name} (${u.codeforcesHandle}).\n\nIsso irá remover:\n• A conta da usuária\n• Todas as ${u.totalCompletionsCount} conclusões\n• Todos os ${u.totalPoints} pontos\n\nEssa ação NÃO pode ser desfeita!`)) return;
                                                                        try {
                                                                            const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
                                                                            const data = await res.json();
                                                                            showToast(data.message || data.error, res.ok ? 'success' : 'error');
                                                                            if (res.ok) fetchAll();
                                                                        } catch {
                                                                            showToast('Erro de conexão', 'error');
                                                                        }
                                                                    }}
                                                                >
                                                                    🗑️ Excluir
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {users.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                            <p>Nenhuma usuária cadastrada.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* CHECKER TAB */}
                        {activeTab === 'checker' && (
                            <div>
                                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                                    <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>🔄</span>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Verificador de Exercícios</h3>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
                                        Execute manualmente a verificação de submissões no Codeforces para todos os exercícios ativos e usuárias cadastradas.
                                    </p>
                                    <button className="btn-primary" onClick={handleRunChecker} style={{ padding: '14px 32px', fontSize: '1rem' }}>
                                        🔍 Executar Verificação Agora
                                    </button>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '16px' }}>
                                        Dica: Configure o cron job para verificação automática a cada 10 minutos.
                                    </p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Toast */}
            {toast && (
                <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
