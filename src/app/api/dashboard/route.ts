import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET /api/dashboard
export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            include: {
                completions: {
                    include: {
                        exercise: true
                    },
                    orderBy: { completedAt: 'desc' }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'Usuária não encontrada' }, { status: 404 });
        }

        // Total points
        const totalPoints = user.completions.reduce((sum, c) => sum + c.pointsAwarded, 0);

        // Daily and weekly counts (use stored type on completion)
        const dailyCompleted = user.completions.filter(c => c.type === 'daily').length;
        const weeklyCompleted = user.completions.filter(c => c.type === 'weekly').length;

        // Calculate streak (consecutive days with daily exercise completed)
        const dailyCompletions = user.completions
            .filter(c => c.type === 'daily')
            .map(c => {
                const d = new Date(c.completedAt);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            })
            .filter((v, i, a) => a.indexOf(v) === i) // unique dates
            .sort()
            .reverse();

        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;

        if (dailyCompletions.length > 0) {
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

            // Current streak
            if (dailyCompletions[0] === todayStr || dailyCompletions[0] === yesterdayStr) {
                currentStreak = 1;
                for (let i = 1; i < dailyCompletions.length; i++) {
                    const prev = new Date(dailyCompletions[i - 1]);
                    const curr = new Date(dailyCompletions[i]);
                    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
                    if (Math.abs(diff - 1) < 0.1) {
                        currentStreak++;
                    } else {
                        break;
                    }
                }
            }

            // Best streak
            const sorted = [...dailyCompletions].sort();
            tempStreak = 1;
            bestStreak = 1;
            for (let i = 1; i < sorted.length; i++) {
                const prev = new Date(sorted[i - 1]);
                const curr = new Date(sorted[i]);
                const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
                if (Math.abs(diff - 1) < 0.1) {
                    tempStreak++;
                    bestStreak = Math.max(bestStreak, tempStreak);
                } else {
                    tempStreak = 1;
                }
            }
            bestStreak = Math.max(bestStreak, currentStreak);
        }

        // Weekly points chart (last 12 weeks)
        const weeklyPoints: { week: string; points: number }[] = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - (i * 7 + weekStart.getDay()));
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);

            const weekPoints = user.completions
                .filter(c => {
                    const d = new Date(c.completedAt);
                    return d >= weekStart && d < weekEnd;
                })
                .reduce((sum, c) => sum + c.pointsAwarded, 0);

            const label = `${String(weekStart.getDate()).padStart(2, '0')}/${String(weekStart.getMonth() + 1).padStart(2, '0')}`;
            weeklyPoints.push({ week: label, points: weekPoints });
        }

        // Completed exercises list
        const completedExercises = user.completions.map(c => ({
            id: c.id,
            exerciseId: c.exerciseId || 0,
            type: c.type, // Use stored type
            contestId: c.contestId || c.exercise?.contestId || 0,
            problemIndex: c.problemIndex || c.exercise?.problemIndex || '',
            title: c.problemName || c.exercise?.title || null,
            pointsAwarded: c.pointsAwarded,
            completedAt: c.completedAt,
            link: `https://codeforces.com/contest/${c.contestId || c.exercise?.contestId}/problem/${c.problemIndex || c.exercise?.problemIndex}`,
        }));

        return NextResponse.json({
            totalPoints,
            dailyCompleted,
            weeklyCompleted,
            currentStreak,
            bestStreak,
            weeklyPoints,
            completedExercises,
            memberSince: user.createdAt,
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        return NextResponse.json({ error: 'Erro ao buscar dashboard' }, { status: 500 });
    }
}
