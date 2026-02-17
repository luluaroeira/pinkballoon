import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET /api/ranking
export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'total'; // 'month', 'semester', 'total'

        let dateFilter: Date | undefined;
        const now = new Date();

        if (period === 'month') {
            dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (period === 'semester') {
            const month = now.getMonth();
            const semesterStart = month < 6 ? 0 : 6;
            dateFilter = new Date(now.getFullYear(), semesterStart, 1);
        }

        const users = await prisma.user.findMany({
            where: { role: 'user' },
            select: {
                id: true,
                name: true,
                codeforcesHandle: true,
                completions: {
                    where: dateFilter ? {
                        completedAt: { gte: dateFilter }
                    } : undefined,
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
            .filter(u => u.totalPoints > 0 || true) // show all users
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
