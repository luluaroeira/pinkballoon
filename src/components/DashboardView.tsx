'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardData {
    totalPoints: number;
    dailyCompleted: number;
    weeklyCompleted: number;
    practiceCompleted: number;
    currentStreak: number;
    bestStreak: number;
    dailyPoints: { day: string; points: number }[];
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
    const [hoveredBar, setHoveredBar] = useState<{ index: number; x: number; y: number } | null>(null);

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

    // Draw bar chart (day by day)
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
        const padding = { top: 20, right: 16, bottom: 50, left: 36 };
        const chartW = w - padding.left - padding.right;
        const chartH = h - padding.top - padding.bottom;

        const points = data.dailyPoints;
        const maxPoints = Math.max(...points.map(p => p.points), 1);

        // Clear
        ctx.clearRect(0, 0, w, h);

        // Grid lines (horizontal)
        const gridLines = 4;
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= gridLines; i++) {
            const y = padding.top + (chartH / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(w - padding.right, y);
            ctx.stroke();
        }

        // Y-axis labels
        ctx.fillStyle = '#8b7a9e';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'right';
        for (let i = 0; i <= gridLines; i++) {
            const y = padding.top + (chartH / gridLines) * i;
            const value = Math.round(maxPoints * (1 - i / gridLines));
            ctx.fillText(String(value), padding.left - 6, y + 4);
        }

        // Bar dimensions
        const totalBars = points.length;
        const barGap = 2;
        const barWidth = Math.max(2, (chartW - barGap * (totalBars - 1)) / totalBars);

        // Draw bars
        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
        gradient.addColorStop(0, '#ec4899');
        gradient.addColorStop(0.5, '#a855f7');
        gradient.addColorStop(1, '#6366f1');

        points.forEach((p, i) => {
            const x = padding.left + i * (barWidth + barGap);
            const barH = (p.points / maxPoints) * chartH;
            const y = padding.top + chartH - barH;

            if (p.points > 0) {
                // Bar glow
                ctx.save();
                ctx.shadowColor = 'rgba(236, 72, 153, 0.3)';
                ctx.shadowBlur = 6;
                ctx.shadowOffsetY = 2;

                // Rounded top bar
                const radius = Math.min(barWidth / 2, 4);
                ctx.beginPath();
                ctx.moveTo(x, y + radius);
                ctx.arcTo(x, y, x + barWidth, y, radius);
                ctx.arcTo(x + barWidth, y, x + barWidth, y + barH, radius);
                ctx.lineTo(x + barWidth, padding.top + chartH);
                ctx.lineTo(x, padding.top + chartH);
                ctx.closePath();
                ctx.fillStyle = gradient;
                ctx.fill();
                ctx.restore();

                // Point value on top of bar
                if (barH > 18) {
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 9px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(String(p.points), x + barWidth / 2, y - 4);
                }
            } else {
                // Subtle empty indicator
                ctx.fillStyle = 'rgba(168, 85, 247, 0.06)';
                ctx.fillRect(x, padding.top + chartH - 2, barWidth, 2);
            }
        });

        // X-axis labels (show every few days to avoid overlap)
        ctx.fillStyle = '#8b7a9e';
        ctx.font = '9px Inter, sans-serif';
        ctx.textAlign = 'center';

        // Show labels every N days based on total count  
        const step = totalBars <= 14 ? 1 : totalBars <= 21 ? 2 : 3;
        points.forEach((p, i) => {
            if (i % step === 0 || i === totalBars - 1) {
                const x = padding.left + i * (barWidth + barGap) + barWidth / 2;
                ctx.save();
                ctx.translate(x, h - 6);
                ctx.rotate(-Math.PI / 4);
                ctx.textAlign = 'right';
                ctx.fillText(p.day, 0, 0);
                ctx.restore();
            }
        });

    }, [data]);

    // Handle hover on canvas
    const handleCanvasHover = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!data || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;

        const points = data.dailyPoints;
        const padding = { left: 36, right: 16, top: 20, bottom: 50 };
        const chartW = rect.width - padding.left - padding.right;
        const barGap = 2;
        const barWidth = Math.max(2, (chartW - barGap * (points.length - 1)) / points.length);

        const index = Math.floor((mouseX - padding.left) / (barWidth + barGap));
        if (index >= 0 && index < points.length && points[index].points > 0) {
            setHoveredBar({ index, x: e.clientX - rect.left, y: e.clientY - rect.top });
        } else {
            setHoveredBar(null);
        }
    };

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

    const totalExercises = data.completedExercises.length;

    const getTypeBadge = (type: string) => {
        if (type === 'daily') return { cls: 'badge-daily', label: 'Diário' };
        if (type === 'weekly') return { cls: 'badge-weekly', label: 'Semanal' };
        return { cls: 'badge-points', label: 'Prática' };
    };

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
                        <span>As pontuações são atualizadas automaticamente a cada 10 minutos. Após submeter no Codeforces, aguarde um pouquinho para ver seus pontos aqui!</span>
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
                        <div className="stat-label">Streak Atual (dias)</div>
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

                {/* Chart - Day by Day */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>
                        📈 Pontos por Dia
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Últimos 30 dias • Cada barra representa os pontos ganhos em um dia
                    </p>
                    <div style={{ width: '100%', height: '280px', position: 'relative' }}>
                        <canvas
                            ref={canvasRef}
                            style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
                            onMouseMove={handleCanvasHover}
                            onMouseLeave={() => setHoveredBar(null)}
                        />
                        {/* Tooltip */}
                        {hoveredBar && data.dailyPoints[hoveredBar.index] && (
                            <div style={{
                                position: 'absolute',
                                left: hoveredBar.x,
                                top: hoveredBar.y - 40,
                                transform: 'translateX(-50%)',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--card-border)',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                pointerEvents: 'none',
                                whiteSpace: 'nowrap',
                                zIndex: 10,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            }}>
                                {data.dailyPoints[hoveredBar.index].day}: <span className="gradient-text">{data.dailyPoints[hoveredBar.index].points} pts</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Completed exercises */}
                <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>
                        ✅ Exercícios Concluídos ({totalExercises})
                    </h3>

                    {totalExercises === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🎯</span>
                            <p>Nenhum exercício concluído ainda.</p>
                            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Resolva o exercício do dia para começar! 💪</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {data.completedExercises.map(ex => {
                                const badge = getTypeBadge(ex.type);
                                return (
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
                                            background: ex.type === 'practice' ? 'rgba(99, 102, 241, 0.04)' : 'rgba(34, 197, 94, 0.04)',
                                            borderRadius: '10px',
                                            textDecoration: 'none',
                                            color: 'inherit',
                                            transition: 'all 0.2s',
                                            flexWrap: 'wrap',
                                            gap: '8px',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span className={`badge ${badge.cls}`}>
                                                {badge.label}
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
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
