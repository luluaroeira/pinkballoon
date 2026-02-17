'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface RankingEntry {
    position: number;
    id: number;
    name: string;
    codeforcesHandle: string;
    totalPoints: number;
    exercisesCompleted: number;
}

export default function RankingView() {
    const { user } = useAuth();
    const [ranking, setRanking] = useState<RankingEntry[]>([]);
    const [period, setPeriod] = useState('total');
    const [loading, setLoading] = useState(true);

    const fetchRanking = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/ranking?period=${period}`);
            const data = await res.json();
            setRanking(data.ranking || []);
        } catch (err) {
            console.error('Error fetching ranking:', err);
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        fetchRanking();
    }, [fetchRanking]);

    const getPositionStyle = (pos: number) => {
        if (pos === 1) return 'position-1';
        if (pos === 2) return 'position-2';
        if (pos === 3) return 'position-3';
        return '';
    };

    const getMedal = (pos: number) => {
        if (pos === 1) return '🥇';
        if (pos === 2) return '🥈';
        if (pos === 3) return '🥉';
        return '';
    };

    return (
        <div className="page-container">
            {/* Background */}
            <div className="bg-blob" style={{
                width: '500px', height: '500px',
                background: 'radial-gradient(circle, rgba(236,72,153,0.12), transparent)',
                top: '50px', left: '-200px',
            }} />

            <div className="animate-fade-in">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>🏆</span>
                            <span className="gradient-text">Ranking</span>
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                            Quem está mandando bem! Constância é a chave.
                        </p>
                    </div>

                    <div className="tab-group">
                        {[
                            { key: 'month', label: 'Mês' },
                            { key: 'semester', label: 'Semestre' },
                            { key: 'total', label: 'Total' },
                        ].map(p => (
                            <button
                                key={p.key}
                                className={`tab ${period === p.key ? 'active' : ''}`}
                                onClick={() => setPeriod(p.key)}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {/* Header */}
                    <div className="ranking-row" style={{
                        background: 'rgba(168, 85, 247, 0.08)',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        borderBottom: '1px solid var(--card-border)',
                    }}>
                        <span>#</span>
                        <span>Competidora</span>
                        <span style={{ textAlign: 'center' }}>Handle CF</span>
                        <span style={{ textAlign: 'right' }}>Pontos</span>
                    </div>

                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Carregando ranking... 🎈
                        </div>
                    ) : ranking.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🏆</span>
                            <p>Nenhuma pontuação ainda neste período.</p>
                            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Resolva exercícios para aparecer aqui!</p>
                        </div>
                    ) : (
                        ranking.map(entry => (
                            <div
                                key={entry.id}
                                className="ranking-row"
                                style={{
                                    background: entry.id === user?.id ? 'rgba(236, 72, 153, 0.06)' : 'transparent',
                                    borderLeft: entry.id === user?.id ? '3px solid var(--pink-500)' : 'none',
                                }}
                            >
                                <div>
                                    {entry.position <= 3 ? (
                                        <div className={`position-badge ${getPositionStyle(entry.position)}`}>
                                            {getMedal(entry.position)}
                                        </div>
                                    ) : (
                                        <div className="position-badge" style={{
                                            background: 'var(--bg-card)',
                                            border: '1px solid var(--card-border)',
                                            color: 'var(--text-muted)',
                                        }}>
                                            {entry.position}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                        {entry.name}
                                        {entry.id === user?.id && (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--pink-400)', marginLeft: '8px' }}>
                                                (você)
                                            </span>
                                        )}
                                    </span>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        {entry.exercisesCompleted} exercício{entry.exercisesCompleted !== 1 ? 's' : ''} resolvido{entry.exercisesCompleted !== 1 ? 's' : ''}
                                    </div>
                                </div>
                                <a
                                    href={`https://codeforces.com/profile/${entry.codeforcesHandle}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        color: 'var(--purple-400)',
                                        textDecoration: 'none',
                                        fontSize: '0.85rem',
                                        textAlign: 'center',
                                        fontWeight: 500,
                                    }}
                                >
                                    {entry.codeforcesHandle}
                                </a>
                                <div style={{ textAlign: 'right' }}>
                                    <span className="gradient-text" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                                        {entry.totalPoints}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>pts</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
