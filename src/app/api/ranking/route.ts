import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { maybeRunChecker } from '@/lib/auto-checker';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// GET /api/ranking
export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        // Run checker synchronously so points are fresh on page load
        await maybeRunChecker();

        const { searchParams } = new URL(request.url);
        const periodParam = searchParams.get('period'); // 'month', 'semester'

        let dateFilterStart: Date | undefined;
        let dateFilterEnd: Date | undefined;
        const now = new Date();

        // 1. Check for ACTIVE SCORING PERIOD (Admin config)
        const activePeriod = await prisma.scoringPeriod.findFirst({
            where: { isActive: true }
        });

        if (activePeriod) {
            dateFilterStart = activePeriod.startDate;
            dateFilterEnd = activePeriod.endDate;
        }
        // 2. Fallback to query params if no period is active (or maybe combine?)
        // User requested: "pontuacoes nao devem computar exercicios feitos ao todo... apenas aqueles feitos em um certo periodo"
        // So if active period exists, it takes precedence for the main ranking.
        else if (periodParam === 'month') {
            dateFilterStart = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (periodParam === 'semester') {
            const month = now.getMonth();
            const semesterStart = month < 6 ? 0 : 6;
            dateFilterStart = new Date(now.getFullYear(), semesterStart, 1);
        }

        const users = await prisma.user.findMany({
            where: { role: 'user' },
            select: {
                id: true,
                name: true,
                codeforcesHandle: true,
                completions: {
                    where: {
                        completedAt: {
                            gte: dateFilterStart,
                            lte: dateFilterEnd
                        }
                    },
                    select: {
                        pointsAwarded: true,
                        completedAt: true,
                    }
                }
            }
        });

        const ranking = users.map(user => {
            const totalPoints = user.completions.reduce((sum, c) => sum + c.pointsAwarded, 0);
            const lastPointAt = user.completions.length > 0
                ? Math.max(...user.completions.map(c => new Date(c.completedAt).getTime()))
                : 0;

            return {
                id: user.id,
                name: user.name,
                codeforcesHandle: user.codeforcesHandle,
                totalPoints,
                lastPointAt,
                exercisesCompleted: user.completions.length,
            };
        })
            .sort((a, b) => {
                // Sort by points desc, then by lastPointAt asc (who got there first)
                if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
                return a.lastPointAt - b.lastPointAt;
            })
            .map((user, index) => ({
                ...user,
                position: index + 1,
            }));


        return NextResponse.json({ ranking });
    } catch (error) {
        console.error('Ranking error:', error);
        return NextResponse.json({ error: 'Erro ao buscar ranking' }, { status: 500 });
    }
}
