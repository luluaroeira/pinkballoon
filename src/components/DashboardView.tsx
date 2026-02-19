'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardData {
    totalPoints: number;
    dailyCompleted: number;
    weeklyCompleted: number;
    currentStreak: number;
    bestStreak: number;
    weeklyPoints: { week: string; points: number }[];
    completedExercises: {
        id: number;
        exerciseId: number;
        type: string;
        contestId: number;
        problemIndex: string;
        title: string | null;
        pointsAwarded: number;
        completedAt: string;
        link: string;
    }[];
    memberSince: string;
}

export default function DashboardView() {
    const { user } = useAuth();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const fetchDashboard = useCallback(async () => {
        try {
            const res = await fetch('/api/dashboard');
            const result = await res.json();
            setData(result);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    // Draw chart manually (no external chart library needed for this simple one)
    useEffect(() => {
        if (!data || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const w = rect.width;
        const h = rect.height;
        const padding = { top: 20, right: 20, bottom: 40, left: 40 };
        const chartW = w - padding.left - padding.right;
        const chartH = h - padding.top - padding.bottom;

        const points = data.weeklyPoints;
        const maxPoints = Math.max(...points.map(p => p.points), 1);

        // Clear
        ctx.clearRect(0, 0, w, h);

        // Grid lines
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartH / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(w - padding.right, y);
            ctx.stroke();
        }

        // Y-axis labels
        ctx.fillStyle = '#8b7a9e';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartH / 4) * i;
            const value = Math.round(maxPoints * (1 - i / 4));
            ctx.fillText(String(value), padding.left - 8, y + 4);
        }

        // Draw area gradient
        const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
        gradient.addColorStop(0, 'rgba(236, 72, 153, 0.3)');
        gradient.addColorStop(1, 'rgba(236, 72, 153, 0.0)');

        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + chartH);
        points.forEach((p, i) => {
            const x = padding.left + (chartW / (points.length - 1)) * i;
            const y = padding.top + chartH - (p.points / maxPoints) * chartH;
            ctx.lineTo(x, y);
        });
        ctx.lineTo(padding.left + chartW, padding.top + chartH);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw line
        ctx.beginPath();
        const lineGradient = ctx.createLinearGradient(padding.left, 0, w - padding.right, 0);
        lineGradient.addColorStop(0, '#ec4899');
        lineGradient.addColorStop(0.5, '#a855f7');
        lineGradient.addColorStop(1, '#6366f1');
        ctx.strokeStyle = lineGradient;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';

        points.forEach((p, i) => {
            const x = padding.left + (chartW / (points.length - 1)) * i;
            const y = padding.top + chartH - (p.points / maxPoints) * chartH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw dots
        points.forEach((p, i) => {
            const x = padding.left + (chartW / (points.length - 1)) * i;
            const y = padding.top + chartH - (p.points / maxPoints) * chartH;

            // Glow
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(236, 72, 153, 0.3)';
            ctx.fill();

            // Dot
            ctx.beginPath();
            ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ec4899';
            ctx.fill();
            ctx.strokeStyle = '#1a1128';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        });

        // X-axis labels
        ctx.fillStyle = '#8b7a9e';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        points.forEach((p, i) => {
            if (i % 2 === 0 || points.length <= 6) {
                const x = padding.left + (chartW / (points.length - 1)) * i;
                ctx.fillText(p.week, x, h - 8);
            }
        });
    }, [data]);

    if (loading) {
        return (
            <div className="page-container">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="loading-pulse" style={{ height: '100px' }} />
                    ))}
                </div>
                <div className="loading-pulse" style={{ height: '300px' }} />
            </div>
        );
    }

    if (!data || (data as any).error) {
        return (
            <div className="page-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
                <p style={{ color: 'var(--text-muted)' }}>
                    {(data as any)?.error || 'Erro ao carregar dashboard.'}
                </p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="bg-blob" style={{
                width: '400px', height: '400px',
                background: 'radial-gradient(circle, rgba(168,85,247,0.12), transparent)',
                top: '200px', right: '-100px',
            }} />

            <div className="animate-fade-in">
                <div style={{ marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>📊</span>
                        <span className="gradient-text">Meu Desenvolvimento</span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                        Membro desde {new Date(data.memberSince).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • {user?.codeforcesHandle}
                    </p>
                    <div style={{
                        marginTop: '12px', padding: '10px 14px', borderRadius: '10px',
                        background: 'rgba(168, 85, 247, 0.08)',
                        border: '1px solid rgba(168, 85, 247, 0.15)',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '0.8rem', color: 'var(--text-secondary)'
                    }}>
                        <span>⏳</span>
                        <span>As pontuações são atualizadas automaticamente a cada 3 minutos. Após submeter no Codeforces, aguarde um pouquinho para ver seus pontos aqui!</span>
                    </div>
                </div>

                {/* Stats grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '12px',
                    marginBottom: '28px',
                }}>
                    <div className="stat-card">
                        <div className="stat-value">{data.totalPoints}</div>
                        <div className="stat-label">Pontos Totais</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{data.dailyCompleted}</div>
                        <div className="stat-label">Diários Feitos</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{data.weeklyCompleted}</div>
                        <div className="stat-label">Semanais Feitos</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">
                            <span className="streak-fire">🔥</span> {data.currentStreak}
                        </div>
                        <div className="stat-label">Streak Atual</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">⭐ {data.bestStreak}</div>
                        <div className="stat-label">Melhor Streak</div>
                    </div>
                </div>

                {/* Motivational message based on streak */}
                {data.currentStreak > 0 && (
                    <div className="card" style={{
                        marginBottom: '24px',
                        background: 'linear-gradient(135deg, rgba(236,72,153,0.1), rgba(168,85,247,0.1))',
                        borderColor: 'rgba(236,72,153,0.3)',
                        textAlign: 'center',
                    }}>
                        <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                            {data.currentStreak >= 7 ? '🎉 Incrível! Uma semana de streak! Você é imparável!' :
                                data.currentStreak >= 3 ? '🔥 Bora manter o streak! Constância conta!' :
                                    '✨ Boa! Continue assim! Cada dia conta!'}
                        </p>
                    </div>
                )}

                {/* Chart */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>
                        📈 Pontos por Semana
                    </h3>
                    <div style={{ width: '100%', height: '250px' }}>
                        <canvas
                            ref={canvasRef}
                            style={{ width: '100%', height: '100%' }}
                        />
                    </div>
                </div>

                {/* Completed exercises */}
                <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>
                        ✅ Exercícios Concluídos ({data.completedExercises.length})
                    </h3>

                    {data.completedExercises.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🎯</span>
                            <p>Nenhum exercício concluído ainda.</p>
                            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Resolva o exercício do dia para começar! 💪</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {data.completedExercises.map(ex => (
                                <a
                                    key={ex.id}
                                    href={ex.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px 16px',
                                        background: 'rgba(34, 197, 94, 0.04)',
                                        borderRadius: '10px',
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        transition: 'all 0.2s',
                                        flexWrap: 'wrap',
                                        gap: '8px',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span className={`badge ${ex.type === 'daily' ? 'badge-daily' : 'badge-weekly'}`}>
                                            {ex.type === 'daily' ? 'Diário' : 'Semanal'}
                                        </span>
                                        <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                                            {ex.title || `CF ${ex.contestId}${ex.problemIndex}`}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span className="badge badge-success">+{ex.pointsAwarded} pt{ex.pointsAwarded > 1 ? 's' : ''}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {new Date(ex.completedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                        </span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
