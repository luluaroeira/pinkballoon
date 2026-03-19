'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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
    completed: boolean;
    expired: boolean;
    completionData: { completedAt: string; pointsAwarded: number } | null;
}

interface Contest {
    id: number;
    name: string;
    startTimeSeconds: number;
    durationSeconds: number;
}

interface Announcement {
    id: number;
    content: string;
    createdAt: string;
}

export default function HomePage() {
    const { user } = useAuth();
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [contests, setContests] = useState<Contest[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [exRes, contRes, annRes] = await Promise.all([
                fetch('/api/exercises'),
                fetch('/api/contests'),
                fetch('/api/announcements'),
            ]);

            const [exData, contData, annData] = await Promise.all([
                exRes.json(),
                contRes.json(),
                annRes.json(),
            ]);

            setExercises(exData.exercises || []);
            setContests(contData.contests || []);
            setAnnouncements(annData.announcements || []);
        } catch (err) {
            console.error('Error fetching home data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const dailyExercise = exercises.find(e => e.type === 'daily');
    const weeklyExercise = exercises.find(e => e.type === 'weekly');

    const formatDate = (ts: number) => {
        return new Date(ts * 1000).toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="page-container">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="loading-pulse" style={{ height: '200px' }} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="page-container" style={{ position: 'relative' }}>
            {/* Background effects */}
            <div className="bg-blob" style={{
                width: '400px', height: '400px',
                background: 'radial-gradient(circle, rgba(236,72,153,0.15), transparent)',
                top: '100px', right: '-100px',
            }} />

            {/* Greeting */}
            <div className="animate-fade-in" style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '6px' }}>
                    Olá, <span className="gradient-text">{user?.name}</span>! 🎈
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    Bora manter a constância? Seu progresso conta! 💪
                </p>
            </div>

            {/* Main grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '20px',
            }}>

                {/* Daily Exercise Card */}
                <div className="card animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.5rem' }}>📝</span>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Exercício do Dia</h2>
                        </div>
                        <span className="badge badge-daily">Diário</span>
                    </div>

                    {dailyExercise ? (
                        <div>
                            <h3 style={{ fontWeight: 600, marginBottom: '8px', fontSize: '1rem' }}>
                                {dailyExercise.title || `CF ${dailyExercise.contestId}${dailyExercise.problemIndex}`}
                            </h3>
                            {dailyExercise.description && (
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>
                                    {dailyExercise.description}
                                </p>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                <span className="badge badge-points">+{dailyExercise.points} pt{dailyExercise.points > 1 ? 's' : ''}</span>
                                {dailyExercise.completed ? (
                                    <span className="badge badge-success">✓ Concluído</span>
                                ) : dailyExercise.expired ? (
                                    <span className="badge badge-expired">Expirado</span>
                                ) : (
                                    <span className="badge badge-pending">⏳ Pendente</span>
                                )}
                            </div>
                            <a
                                href={`https://codeforces.com/contest/${dailyExercise.contestId}/problem/${dailyExercise.problemIndex}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary"
                                style={{ display: 'inline-block', textDecoration: 'none', fontSize: '0.85rem', padding: '10px 20px' }}
                            >
                                Abrir no Codeforces →
                            </a>
                        </div>
                    ) : (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>✨</span>
                            <p>Nenhum exercício diário ativo no momento.</p>
                            <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Fique ligada, o admin pode postar a qualquer momento!</p>
                        </div>
                    )}
                </div>

                {/* Weekly Exercise Card */}
                <div className="card animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.5rem' }}>🎯</span>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Exercício da Semana</h2>
                        </div>
                        <span className="badge badge-weekly">Semanal</span>
                    </div>

                    {weeklyExercise ? (
                        <div>
                            <h3 style={{ fontWeight: 600, marginBottom: '8px', fontSize: '1rem' }}>
                                {weeklyExercise.title || `CF ${weeklyExercise.contestId}${weeklyExercise.problemIndex}`}
                            </h3>
                            {weeklyExercise.description && (
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>
                                    {weeklyExercise.description}
                                </p>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                <span className="badge badge-points">+{weeklyExercise.points} pt{weeklyExercise.points > 1 ? 's' : ''}</span>
                                {weeklyExercise.completed ? (
                                    <span className="badge badge-success">✓ Concluído</span>
                                ) : weeklyExercise.expired ? (
                                    <span className="badge badge-expired">Expirado</span>
                                ) : (
                                    <span className="badge badge-pending">⏳ Pendente</span>
                                )}
                            </div>
                            <a
                                href={`https://codeforces.com/contest/${weeklyExercise.contestId}/problem/${weeklyExercise.problemIndex}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary"
                                style={{ display: 'inline-block', textDecoration: 'none', fontSize: '0.85rem', padding: '10px 20px' }}
                            >
                                Abrir no Codeforces →
                            </a>
                        </div>
                    ) : (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>📚</span>
                            <p>Nenhum exercício semanal ativo no momento.</p>
                        </div>
                    )}
                </div>

                {/* Announcements Card */}
                <div className="card animate-fade-in" style={{ animationDelay: '0.3s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '1.5rem' }}>📢</span>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Avisos PinkBalloon</h2>
                    </div>

                    {announcements.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {announcements.slice(0, 5).map(ann => (
                                <div key={ann.id} style={{
                                    padding: '12px 16px',
                                    background: 'rgba(168, 85, 247, 0.06)',
                                    borderRadius: '10px',
                                    borderLeft: '3px solid var(--pink-500)',
                                }}>
                                    <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{ann.content}</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                                        {new Date(ann.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                            Nenhum aviso no momento. 🎈
                        </p>
                    )}
                </div>

                {/* Upcoming Contests */}
                <div className="card animate-fade-in" style={{ animationDelay: '0.4s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '1.5rem' }}>⚡</span>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Próximos Contests</h2>
                    </div>

                    {contests.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {contests.map(contest => {
                                const startDate = new Date(contest.startTimeSeconds * 1000);
                                const now = new Date();
                                const diffMs = startDate.getTime() - now.getTime();
                                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                                const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

                                return (
                                    <a
                                        key={contest.id}
                                        href={`https://codeforces.com/contest/${contest.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            textDecoration: 'none',
                                            color: 'inherit',
                                            padding: '12px 16px',
                                            background: 'rgba(99, 102, 241, 0.06)',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(99, 102, 241, 0.15)',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                                            {contest.name}
                                        </h4>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {formatDate(contest.startTimeSeconds)}
                                            </span>
                                            {diffMs > 0 && (
                                                <span className="countdown" style={{ fontSize: '0.8rem' }}>
                                                    ⏰ {hours > 0 ? `${hours}h ` : ''}{minutes}min
                                                </span>
                                            )}
                                        </div>
                                    </a>
                                );
                            })}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                            Nenhum contest nos próximos 3 dias. Aproveite para treinar! 💪
                        </p>
                    )}
                </div>
                {/* Info Card - Como funciona o Ranking */}
                <div className="card animate-fade-in" style={{ animationDelay: '0.5s', gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '1.5rem' }}>🏆</span>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Como Funciona o Ranking?</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                        <p>
                            ⏱️ <strong>Sincronização Automática:</strong> O nosso sistema verifica as suas submissões no <strong>Codeforces</strong> a cada <strong>3 minutos</strong>. Isso significa que, após você submeter uma resposta correta lá, pode levar alguns minutos até os pontos aparecerem aqui. Apenas problemas com status <span style={{ color: 'var(--green-400)', fontWeight: 600 }}>Accepted (OK)</span> geram pontos!
                        </p>

                        <p>
                            🎯 <strong>Exercícios (Missões):</strong> Se você resolver um &quot;Exercício do Dia&quot; ou &quot;Da Semana&quot; dentro do prazo, você ganha a pontuação indicada no card da missão correspondente.
                        </p>

                        <div>
                            <p style={{ marginBottom: '10px' }}>💪 <strong>Prática Livre (Qualquer problema):</strong> Você também ganha pontos extras praticando outros problemas livres do Codeforces! A pontuação depende da dificuldade (Rating) oficial do problema resolvido:</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span className="badge badge-points" style={{ minWidth: '40px', textAlign: 'center' }}>1 pt</span> <span>Até 1000 <em>(ou sem rank)</em></span></div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span className="badge badge-points" style={{ minWidth: '40px', textAlign: 'center' }}>2 pts</span> <span>Rating 1100 a 1299</span></div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span className="badge badge-points" style={{ minWidth: '40px', textAlign: 'center' }}>3 pts</span> <span>Rating 1300 a 1499</span></div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span className="badge badge-points" style={{ minWidth: '40px', textAlign: 'center' }}>4 pts</span> <span>Rating 1500 a 1699</span></div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span className="badge badge-points" style={{ minWidth: '40px', textAlign: 'center' }}>5 pts</span> <span>Rating 1700+</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
