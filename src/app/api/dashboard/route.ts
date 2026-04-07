import { NextResponse, after } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { maybeRunChecker } from '@/lib/auto-checker';

// GET /api/dashboard
export async function GET() {
    // Trigger checker in background after response is sent (if 10+ min since last run)
    after(async () => {
        await maybeRunChecker();
    });
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

        // Check active period
        const activePeriod = await prisma.scoringPeriod.findFirst({
            where: { isActive: true }
        });

        // Filter completions if active period exists
        let completions = user.completions;
        if (activePeriod) {
            const start = new Date(activePeriod.startDate).getTime();
            const end = new Date(activePeriod.endDate).getTime();
            completions = user.completions.filter(c => {
                const t = new Date(c.completedAt).getTime();
                return t >= start && t <= end;
            });
        }

        // Total points (based on filtered completions)
        const totalPoints = completions.reduce((sum, c) => sum + c.pointsAwarded, 0);

        // Daily and weekly counts - count by the exercise's type (daily/weekly targets)
        const dailyCompleted = completions.filter(c => c.type === 'daily').length;
        const weeklyCompleted = completions.filter(c => c.type === 'weekly').length;

        // Calculate streak (consecutive days with ANY exercise completed - daily, weekly, or practice)
        const allCompletionDates = completions
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

        if (allCompletionDates.length > 0) {
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

            // Current streak
            if (allCompletionDates[0] === todayStr || allCompletionDates[0] === yesterdayStr) {
                currentStreak = 1;
                for (let i = 1; i < allCompletionDates.length; i++) {
                    const prev = new Date(allCompletionDates[i - 1]);
                    const curr = new Date(allCompletionDates[i]);
                    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
                    if (Math.abs(diff - 1) < 0.1) {
                        currentStreak++;
                    } else {
                        break;
                    }
                }
            }

            // Best streak
            const sorted = [...allCompletionDates].sort();
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

        // Daily points chart (last 30 days, day by day)
        const dailyPoints: { day: string; points: number }[] = [];
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
            const dayDate = new Date(now);
            dayDate.setDate(dayDate.getDate() - i);
            dayDate.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayDate);
            dayEnd.setHours(23, 59, 59, 999);

            const dayPts = completions
                .filter(c => {
                    const d = new Date(c.completedAt);
                    return d >= dayDate && d <= dayEnd;
                })
                .reduce((sum, c) => sum + c.pointsAwarded, 0);

            const label = `${String(dayDate.getDate()).padStart(2, '0')}/${String(dayDate.getMonth() + 1).padStart(2, '0')}`;
            dailyPoints.push({ day: label, points: dayPts });
        }

        // Completed exercises list (all types)
        const completedExercises = completions.map(c => ({
            id: c.id,
            exerciseId: c.exerciseId || 0,
            type: c.type, // daily, weekly, or practice
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
            practiceCompleted: completions.filter(c => c.type === 'practice').length,
            currentStreak,
            bestStreak,
            dailyPoints,
            completedExercises,
            memberSince: user.createdAt,
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        return NextResponse.json({ error: 'Erro ao buscar dashboard' }, { status: 500 });
    }
}
