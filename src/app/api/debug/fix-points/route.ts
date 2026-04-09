import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// GET /api/debug/fix-points
// One-time fix: recalculate pointsAwarded for completions that have 0 points
export async function GET() {
    try {
        // Find all completions with 0 points
        const zeroPointCompletions = await prisma.exerciseCompletion.findMany({
            where: { pointsAwarded: 0 },
            select: {
                id: true,
                contestId: true,
                problemIndex: true,
                problemName: true,
                difficulty: true,
                type: true,
                exerciseId: true,
                userId: true,
                user: { select: { codeforcesHandle: true } },
            }
        });

        const fixes: { id: number; handle: string; problem: string; oldPoints: number; newPoints: number }[] = [];

        for (const completion of zeroPointCompletions) {
            let newPoints = 0;

            if (completion.type === 'daily' || completion.type === 'weekly') {
                // For target exercises, look up the exercise points from DB
                if (completion.exerciseId) {
                    const exercise = await prisma.exercise.findUnique({
                        where: { id: completion.exerciseId },
                        select: { points: true }
                    });
                    newPoints = exercise?.points || 1;
                } else {
                    newPoints = 1;
                }
            } else {
                // Practice: use corrected rating tiers
                const rating = completion.difficulty || 0;
                if (rating >= 1800) newPoints = 5;
                else if (rating >= 1600) newPoints = 4;
                else if (rating >= 1400) newPoints = 3;
                else if (rating >= 1200) newPoints = 2;
                else newPoints = 1;
            }

            // Update in DB
            await prisma.exerciseCompletion.update({
                where: { id: completion.id },
                data: { pointsAwarded: newPoints }
            });

            fixes.push({
                id: completion.id,
                handle: completion.user.codeforcesHandle,
                problem: `${completion.contestId}${completion.problemIndex} (${completion.problemName})`,
                oldPoints: 0,
                newPoints,
            });
        }

        return NextResponse.json({
            message: `Fixed ${fixes.length} completions with 0 points`,
            fixes,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
