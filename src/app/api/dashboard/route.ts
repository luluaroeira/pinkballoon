import { NextResponse, after } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { maybeRunChecker } from '@/lib/auto-checker';

// Helper: get a Date adjusted to BRT (UTC-3) for day-level grouping
function toBRT(date: Date): Date {
    return new Date(date.getTime() - 3 * 60 * 60 * 1000);
}

function getBRTDateString(date: Date): string {
    const brt = toBRT(date);
    return `${brt.getUTCFullYear()}-${String(brt.getUTCMonth() + 1).padStart(2, '0')}-${String(brt.getUTCDate()).padStart(2, '0')}`;
}

function getBRTDayLabel(date: Date): string {
    const brt = toBRT(date);
    return `${String(brt.getUTCDate()).padStart(2, '0')}/${String(brt.getUTCMonth() + 1).padStart(2, '0')}`;
}

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

        // Dashboard shows ALL user completions (personal progress view).
        // Period-specific filtering is handled by each ranking individually.
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

        const completions = user.completions;

        // Total points (based on filtered completions)
        const totalPoints = completions.reduce((sum, c) => sum + c.pointsAwarded, 0);

        // Daily and weekly counts - count by the exercise's type (daily/weekly targets)
        const dailyCompleted = completions.filter(c => c.type === 'daily').length;
        const weeklyCompleted = completions.filter(c => c.type === 'weekly').length;

        // Calculate streak (consecutive days with ANY exercise completed - daily, weekly, or practice)
        // Use BRT timezone for day boundaries so it matches user's local time
        const allCompletionDates = completions
            .map(c => getBRTDateString(new Date(c.completedAt)))
            .filter((v, i, a) => a.indexOf(v) === i) // unique dates
            .sort()
            .reverse();

        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;

        if (allCompletionDates.length > 0) {
            const todayStr = getBRTDateString(new Date());
            const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const yesterdayStr = getBRTDateString(yesterdayDate);

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
        // Group by BRT day so points match the user's local midnight boundaries
        const dailyPoints: { day: string; points: number }[] = [];
        const nowMs = Date.now();

        // Pre-compute a map of BRT date string -> total points
        const pointsByDay = new Map<string, number>();
        for (const c of completions) {
            const dayKey = getBRTDateString(new Date(c.completedAt));
            pointsByDay.set(dayKey, (pointsByDay.get(dayKey) || 0) + c.pointsAwarded);
        }

        for (let i = 29; i >= 0; i--) {
            const dayDate = new Date(nowMs - i * 24 * 60 * 60 * 1000);
            const dayKey = getBRTDateString(dayDate);
            const label = getBRTDayLabel(dayDate);
            dailyPoints.push({ day: label, points: pointsByDay.get(dayKey) || 0 });
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
