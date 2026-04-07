import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/debug/checker?handle=anakomatsu
// Temporary debug endpoint to investigate checker state
export async function GET(request: NextRequest) {
    const handle = request.nextUrl.searchParams.get('handle') || 'anakomatsu';

    try {
        // Get user
        const user = await prisma.user.findFirst({
            where: { codeforcesHandle: handle },
            select: {
                id: true,
                name: true,
                codeforcesHandle: true,
                lastCheckedSubmissionId: true,
            }
        });

        if (!user) {
            return NextResponse.json({ error: `User ${handle} not found` }, { status: 404 });
        }

        // Get completions
        const completions = await prisma.exerciseCompletion.findMany({
            where: { userId: user.id },
            orderBy: { completedAt: 'desc' },
            take: 20,
            select: {
                id: true,
                submissionId: true,
                contestId: true,
                problemIndex: true,
                problemName: true,
                type: true,
                pointsAwarded: true,
                completedAt: true,
            }
        });

        // Check if 1520D specifically exists
        const has1520D = await prisma.exerciseCompletion.findFirst({
            where: {
                userId: user.id,
                contestId: 1520,
                problemIndex: 'D',
            }
        });

        // Check if 474B specifically exists
        const has474B = await prisma.exerciseCompletion.findFirst({
            where: {
                userId: user.id,
                contestId: 474,
                problemIndex: 'B',
            }
        });

        return NextResponse.json({
            user: {
                id: user.id,
                handle: user.codeforcesHandle,
                lastCheckedSubmissionId: user.lastCheckedSubmissionId,
            },
            totalCompletions: completions.length,
            has1520D: !!has1520D,
            has474B: !!has474B,
            recentCompletions: completions,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
