import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserSubmissions } from '@/lib/codeforces';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// GET /api/debug/checker?handle=anakomatsu
// Debug endpoint to investigate checker state for a specific user
export async function GET(request: NextRequest) {
    const handle = request.nextUrl.searchParams.get('handle') || 'anakomatsu';
    const resetStr = request.nextUrl.searchParams.get('reset');
    const shouldReset = resetStr === 'true';

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

        // Check specific problems
        const has1520D = await prisma.exerciseCompletion.findFirst({
            where: { userId: user.id, contestId: 1520, problemIndex: 'D' }
        });
        const has474B = await prisma.exerciseCompletion.findFirst({
            where: { userId: user.id, contestId: 474, problemIndex: 'B' }
        });

        // Fetch recent CF submissions
        let cfSubmissions;
        try {
            cfSubmissions = await getUserSubmissions(handle, 10, 1);
        } catch (e: any) {
            cfSubmissions = { error: e.message };
        }

        // If reset requested, reset lastCheckedSubmissionId to 0
        let resetResult = null;
        if (shouldReset) {
            await prisma.user.update({
                where: { id: user.id },
                data: { lastCheckedSubmissionId: 0 }
            });
            resetResult = 'lastCheckedSubmissionId reset to 0. Please run checker again.';
        }

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
            cfRecentSubmissions: cfSubmissions,
            resetResult,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
