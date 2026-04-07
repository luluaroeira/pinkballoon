import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST /api/rankings/[id]/join - Request to join a ranking
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { id } = await params;
        const rankingId = Number(id);

        // Check if ranking exists and is active
        const ranking = await prisma.ranking.findUnique({
            where: { id: rankingId }
        });

        if (!ranking || !ranking.isActive) {
            return NextResponse.json({ error: 'Ranking não encontrado ou inativo' }, { status: 404 });
        }

        // Check if user already has a membership
        const existing = await prisma.rankingMembership.findUnique({
            where: {
                rankingId_userId: {
                    rankingId,
                    userId: session.userId,
                }
            }
        });

        if (existing) {
            if (existing.status === 'approved') {
                return NextResponse.json({ error: 'Você já participa deste ranking!' }, { status: 400 });
            }
            if (existing.status === 'pending') {
                return NextResponse.json({ error: 'Sua solicitação já está pendente!' }, { status: 400 });
            }
            if (existing.status === 'rejected') {
                // Allow re-requesting if previously rejected
                await prisma.rankingMembership.update({
                    where: { id: existing.id },
                    data: { status: 'pending' }
                });
                return NextResponse.json({ message: 'Solicitação reenviada com sucesso! ⏳' });
            }
        }

        await prisma.rankingMembership.create({
            data: {
                rankingId,
                userId: session.userId,
                status: 'pending',
            }
        });

        return NextResponse.json({ message: 'Solicitação enviada! Aguarde a aprovação do administrador. ⏳' });
    } catch (error) {
        console.error('Error joining ranking:', error);
        return NextResponse.json({ error: 'Erro ao solicitar participação' }, { status: 500 });
    }
}

// GET /api/rankings/[id] - Get ranking leaderboard (only for approved members)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { id } = await params;
        const rankingId = Number(id);

        const ranking = await prisma.ranking.findUnique({
            where: { id: rankingId },
            include: {
                scoringPeriod: true,
                memberships: {
                    where: { status: 'approved' },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                codeforcesHandle: true,
                                completions: {
                                    select: {
                                        pointsAwarded: true,
                                        completedAt: true,
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!ranking) {
            return NextResponse.json({ error: 'Ranking não encontrado' }, { status: 404 });
        }

        // Check if user is approved member or admin
        const isAdmin = session.role === 'admin';
        const isMember = ranking.memberships.some(m => m.userId === session.userId);

        if (!isAdmin && !isMember) {
            return NextResponse.json({ error: 'Você não participa deste ranking' }, { status: 403 });
        }

        // Filter completions within the scoring period
        const startDate = ranking.scoringPeriod.startDate;
        const endDate = ranking.scoringPeriod.endDate;

        const leaderboard = ranking.memberships.map(m => {
            const periodCompletions = m.user.completions.filter(c => {
                const d = new Date(c.completedAt);
                return d >= startDate && d <= endDate;
            });

            const totalPoints = periodCompletions.reduce((sum, c) => sum + c.pointsAwarded, 0);
            const lastPointAt = periodCompletions.length > 0
                ? Math.max(...periodCompletions.map(c => new Date(c.completedAt).getTime()))
                : 0;

            return {
                id: m.user.id,
                name: m.user.name,
                codeforcesHandle: m.user.codeforcesHandle,
                totalPoints,
                lastPointAt,
                exercisesCompleted: periodCompletions.length,
            };
        })
            .sort((a, b) => {
                if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
                return a.lastPointAt - b.lastPointAt;
            })
            .map((user, index) => ({
                ...user,
                position: index + 1,
            }));

        return NextResponse.json({
            ranking: {
                id: ranking.id,
                name: ranking.name,
                description: ranking.description,
                scoringPeriod: ranking.scoringPeriod,
            },
            leaderboard,
        });
    } catch (error) {
        console.error('Error fetching ranking leaderboard:', error);
        return NextResponse.json({ error: 'Erro ao buscar ranking' }, { status: 500 });
    }
}
