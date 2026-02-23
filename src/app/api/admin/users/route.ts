import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET /api/admin/users - List all users
export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        // Fetch active period for filtering
        const activePeriod = await prisma.scoringPeriod.findFirst({
            where: { isActive: true }
        });

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                codeforcesHandle: true,
                role: true,
                createdAt: true,
                completions: {
                    select: {
                        id: true,
                        pointsAwarded: true,
                        completedAt: true,
                        exercise: {
                            select: {
                                id: true,
                                contestId: true,
                                problemIndex: true,
                                type: true,
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Add period-filtered points to each user
        const usersWithPeriodData = users.map(user => {
            let periodCompletions = user.completions;
            if (activePeriod) {
                const start = new Date(activePeriod.startDate).getTime();
                const end = new Date(activePeriod.endDate).getTime();
                periodCompletions = user.completions.filter(c => {
                    const t = new Date(c.completedAt).getTime();
                    return t >= start && t <= end;
                });
            }
            return {
                ...user,
                periodPoints: periodCompletions.reduce((s, c) => s + c.pointsAwarded, 0),
                periodCompletionsCount: periodCompletions.length,
                totalPoints: user.completions.reduce((s, c) => s + c.pointsAwarded, 0),
                totalCompletionsCount: user.completions.length,
            };
        });

        return NextResponse.json({
            users: usersWithPeriodData,
            activePeriod: activePeriod ? { name: activePeriod.name } : null,
        });
    } catch (error) {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
