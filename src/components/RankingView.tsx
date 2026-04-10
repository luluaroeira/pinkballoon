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

interface AvailableRanking {
    id: number;
    name: string;
    description: string | null;
    scoringPeriod: {
        id: number;
        name: string;
        startDate: string;
        endDate: string;
    };
    memberCount: number;
    myStatus: 'pending' | 'approved' | 'rejected' | null;
    myMembershipId: number | null;
    createdAt: string;
}

interface RankingDetail {
    id: number;
    name: string;
    description: string | null;
    scoringPeriod: {
        name: string;
        startDate: string;
        endDate: string;
    };
}

export default function RankingView() {
    const { user } = useAuth();
    const [ranking, setRanking] = useState<RankingEntry[]>([]);
    const [period, setPeriod] = useState('total');
    const [loading, setLoading] = useState(true);

    // Rankings modal state
    const [showRankingsModal, setShowRankingsModal] = useState(false);
    const [availableRankings, setAvailableRankings] = useState<AvailableRanking[]>([]);
    const [rankingsLoading, setRankingsLoading] = useState(false);
    const [joiningId, setJoiningId] = useState<number | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    // Specific ranking view
    const [viewingRanking, setViewingRanking] = useState<number | null>(null);
    const [rankingDetail, setRankingDetail] = useState<RankingDetail | null>(null);
    const [rankingLeaderboard, setRankingLeaderboard] = useState<RankingEntry[]>([]);
    const [rankingLeaderboardLoading, setRankingLeaderboardLoading] = useState(false);

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

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

    const fetchAvailableRankings = async () => {
        setRankingsLoading(true);
        try {
            const res = await fetch('/api/rankings');
            const data = await res.json();
            setAvailableRankings(data.rankings || []);
        } catch (err) {
            console.error('Error fetching rankings:', err);
        } finally {
            setRankingsLoading(false);
        }
    };

    const handleOpenRankings = () => {
        setShowRankingsModal(true);
        setViewingRanking(null);
        setRankingDetail(null);
        fetchAvailableRankings();
    };

    const handleJoinRanking = async (rankingId: number) => {
        setJoiningId(rankingId);
        try {
            const res = await fetch(`/api/rankings/${rankingId}`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message || 'Solicitação enviada!', 'success');
                fetchAvailableRankings();
            } else {
                showToast(data.error || 'Erro ao solicitar', 'error');
            }
        } catch {
            showToast('Erro de conexão', 'error');
        } finally {
            setJoiningId(null);
        }
    };

    const handleViewRanking = async (rankingId: number) => {
        setViewingRanking(rankingId);
        setRankingLeaderboardLoading(true);
        try {
            const res = await fetch(`/api/rankings/${rankingId}`);
            const data = await res.json();
            if (res.ok) {
                setRankingDetail(data.ranking);
                setRankingLeaderboard(data.leaderboard || []);
            } else {
                showToast(data.error || 'Erro ao carregar', 'error');
                setViewingRanking(null);
            }
        } catch {
            showToast('Erro de conexão', 'error');
            setViewingRanking(null);
        } finally {
            setRankingLeaderboardLoading(false);
        }
    };

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

    const getStatusBadge = (status: string | null) => {
        if (status === 'approved') return { label: 'Participando ✅', cls: 'badge-success' };
        if (status === 'pending') return { label: 'Pendente ⏳', cls: 'badge-warning' };
        if (status === 'rejected') return { label: 'Recusada ❌', cls: 'badge-danger' };
        return null;
    };

    const renderLeaderboard = (entries: RankingEntry[], showHeader = true) => (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Header */}
            {showHeader && (
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
            )}

            {entries.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🏆</span>
                    <p>Nenhuma pontuação ainda neste período.</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Resolva exercícios para aparecer aqui!</p>
                </div>
            ) : (
                entries.map(entry => (
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
    );

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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <button className="btn-primary" onClick={handleOpenRankings} style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '8px 16px', fontSize: '0.85rem',
                        }}>
                            🏅 Rankings
                        </button>
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
                </div>

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Carregando ranking... 🎈
                    </div>
                ) : (
                    renderLeaderboard(ranking)
                )}
            </div>

            {/* Rankings Modal */}
            {showRankingsModal && (
                <>
                    {/* Backdrop */}
                    <div onClick={() => { setShowRankingsModal(false); setViewingRanking(null); }} style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                        zIndex: 9998,
                    }} />
                    {/* Modal */}
                    <div style={{
                        position: 'fixed', top: '80px', left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '20px', padding: '24px',
                        width: '94%', maxWidth: '600px',
                        maxHeight: 'calc(100vh - 100px)', overflowY: 'auto',
                        zIndex: 9999,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    }}>
                        {viewingRanking ? (
                            /* Viewing specific ranking leaderboard */
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                    <button
                                        className="btn-secondary"
                                        onClick={() => { setViewingRanking(null); setRankingDetail(null); }}
                                        style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                    >
                                        ← Voltar
                                    </button>
                                    <div>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                                            🏅 {rankingDetail?.name || 'Ranking'}
                                        </h3>
                                        {rankingDetail?.scoringPeriod && (
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                📅 {rankingDetail.scoringPeriod.name} •{' '}
                                                {new Date(rankingDetail.scoringPeriod.startDate).toLocaleDateString('pt-BR')} até{' '}
                                                {new Date(rankingDetail.scoringPeriod.endDate).toLocaleDateString('pt-BR')}
                                            </p>
                                        )}
                                        {rankingDetail?.description && (
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                {rankingDetail.description}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {rankingLeaderboardLoading ? (
                                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        Carregando ranking... 🎈
                                    </div>
                                ) : (
                                    renderLeaderboard(rankingLeaderboard)
                                )}
                            </>
                        ) : (
                            /* Browsing available rankings */
                            <>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>🏅</span>
                                    <span className="gradient-text">Rankings Disponíveis</span>
                                </h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
                                    Participe de rankings e compita com outras competidoras!
                                </p>

                                {rankingsLoading ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {[1, 2, 3].map(i => <div key={i} className="loading-pulse" style={{ height: '80px' }} />)}
                                    </div>
                                ) : availableRankings.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                        <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>🏅</span>
                                        <p style={{ fontSize: '1rem', fontWeight: 500 }}>Nenhum ranking disponível no momento.</p>
                                        <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>O administrador ainda não criou rankings.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {availableRankings.map(r => {
                                            const badge = getStatusBadge(r.myStatus);
                                            const now = new Date();
                                            const endDate = new Date(r.scoringPeriod.endDate);
                                            const isExpired = now > new Date(endDate.setHours(23, 59, 59));

                                            return (
                                                <div key={r.id} className="card" style={{
                                                    padding: '16px',
                                                    borderLeft: r.myStatus === 'approved' ? '4px solid var(--green-500)' :
                                                        r.myStatus === 'pending' ? '4px solid var(--yellow-500, #eab308)' :
                                                            '4px solid transparent',
                                                    transition: 'all 0.2s ease',
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                                                        <div style={{ flex: 1, minWidth: '200px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                                                <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>🏅 {r.name}</span>
                                                                {badge && (
                                                                    <span className={`badge ${badge.cls}`} style={{ fontSize: '0.7rem' }}>
                                                                        {badge.label}
                                                                    </span>
                                                                )}
                                                                {isExpired && (
                                                                    <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                                                                        Encerrado
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {r.description && (
                                                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                                                    {r.description}
                                                                </p>
                                                            )}
                                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                                📅 {r.scoringPeriod.name} •{' '}
                                                                {new Date(r.scoringPeriod.startDate).toLocaleDateString('pt-BR')} até{' '}
                                                                {new Date(r.scoringPeriod.endDate).toLocaleDateString('pt-BR')}
                                                            </p>
                                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                                👥 {r.memberCount} participante{r.memberCount !== 1 ? 's' : ''}
                                                            </p>
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                                                            {(r.myStatus === 'approved' || user?.role === 'admin') && (
                                                                <button
                                                                    className="btn-primary"
                                                                    onClick={() => handleViewRanking(r.id)}
                                                                    style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                                                                >
                                                                    👀 Ver Ranking
                                                                </button>
                                                            )}
                                                            {r.myStatus === null && !isExpired && (
                                                                <button
                                                                    className="btn-primary"
                                                                    onClick={() => handleJoinRanking(r.id)}
                                                                    disabled={joiningId === r.id}
                                                                    style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                                                                >
                                                                    {joiningId === r.id ? '⏳ Enviando...' : '🙋 Participar'}
                                                                </button>
                                                            )}
                                                            {r.myStatus === 'rejected' && !isExpired && (
                                                                <button
                                                                    className="btn-secondary"
                                                                    onClick={() => handleJoinRanking(r.id)}
                                                                    disabled={joiningId === r.id}
                                                                    style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                                                                >
                                                                    {joiningId === r.id ? '⏳...' : '🔄 Solicitar Novamente'}
                                                                </button>
                                                            )}
                                                            {r.myStatus === 'pending' && (
                                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                                    Aguardando aprovação...
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <button
                                    className="btn-secondary"
                                    onClick={() => setShowRankingsModal(false)}
                                    style={{ marginTop: '20px', width: '100%' }}
                                >
                                    Fechar
                                </button>
                            </>
                        )}
                    </div>
                </>
            )}

            {/* Toast */}
            {toast && (
                <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
