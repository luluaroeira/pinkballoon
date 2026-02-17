import prisma from './prisma';
import { getUserSubmissions, CFSubmission } from './codeforces';

export async function runExerciseChecker() {
    console.log('[Checker] Starting master exercise check cycle...');

    try {
        // 1. Get active TARGET exercises (Daily/Weekly)
        // Only consider published exercises that haven't expired yet for target points
        const now = new Date();
        const activeExercises = await prisma.exercise.findMany({
            where: {
                publishedAt: { lte: now },
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: now } }
                ]
            }
        });

        // 2. Get Users
        const users = await prisma.user.findMany({
            where: { role: 'user' }
        });

        console.log(`[Checker] Checking ${users.length} users against ${activeExercises.length} active targets + general practice...`);

        for (const user of users) {
            await processUser(user, activeExercises);
            // Small delay between users to be nice to API? Not strictly needed if sequential.
            await new Promise(r => setTimeout(r, 500));
        }

        console.log('[Checker] Cycle complete.');

    } catch (error) {
        console.error('[Checker] Critical error in check cycle:', error);
    }
}

async function processUser(user: any, activeExercises: any[]) {
    try {
        // Fetch submissions.
        // Strategy: Fetch page by page until we hit the lastCheckedSubmissionId
        const MAX_PAGES = 10; // Max 1000 submissions lookback to prevent overload
        const COUNT = 100;
        let newSubmissions: CFSubmission[] = [];
        let keepFetching = true;
        let from = 1;

        console.log(`[Checker] Fetching submissions for ${user.codeforcesHandle}...`);

        for (let page = 0; page < MAX_PAGES && keepFetching; page++) {
            const chunk = await getUserSubmissions(user.codeforcesHandle, COUNT, from);

            if (chunk.length === 0) {
                keepFetching = false;
                break;
            }

            for (const sub of chunk) {
                // If we reached the known history, stop fetching OLDER submissions
                if (user.lastCheckedSubmissionId && sub.id <= user.lastCheckedSubmissionId) {
                    keepFetching = false;
                    break;
                }

                newSubmissions.push(sub);
            }

            if (keepFetching && chunk.length < COUNT) {
                keepFetching = false; // End of history
            }

            from += COUNT;
        }

        // Sort: Oldest first (to store roughly in order)
        newSubmissions.sort((a, b) => a.creationTimeSeconds - b.creationTimeSeconds);

        if (newSubmissions.length === 0) {
            console.log(`[Checker] No new submissions for ${user.codeforcesHandle}.`);
            return;
        }

        console.log(`[Checker] Processing ${newSubmissions.length} new submissions for ${user.codeforcesHandle}...`);

        let maxProcessedId = user.lastCheckedSubmissionId || 0;

        for (const sub of newSubmissions) {
            // Track max ID
            if (sub.id > maxProcessedId) maxProcessedId = sub.id;

            // Only care about Accepted submissions
            if (sub.verdict !== 'OK') continue;

            // Check if user has EVER solved this problem (contestId + index)
            // This prevents duplicate points for same problem
            const alreadySolved = await prisma.exerciseCompletion.findFirst({
                where: {
                    userId: user.id,
                    contestId: sub.problem.contestId,
                    problemIndex: sub.problem.index,
                },
                select: { id: true }
            });

            if (alreadySolved) {
                // Already solved, skip points
                continue;
            }

            // Determine Points & Type
            let points = 0;
            let type = 'practice';
            let exerciseId: number | undefined;

            // 1. Check TARGET match
            // Submission time must be >= PublishedAt
            const target = activeExercises.find((ex: any) =>
                ex.contestId === sub.problem.contestId &&
                ex.problemIndex === sub.problem.index &&
                Math.floor(ex.publishedAt.getTime() / 1000) <= sub.creationTimeSeconds
            );

            if (target) {
                points = target.points; // 3 or 5 (as set in DB)
                type = target.type;     // daily or weekly
                exerciseId = target.id;
            } else {
                // 2. Practice Points based on Rating
                const rating = sub.problem.rating || 0;

                if (rating < 800) points = 1; // Unrated or low
                else if (rating >= 800 && rating <= 999) points = 1;
                else if (rating >= 1000 && rating <= 1199) points = 2;
                else if (rating >= 1200 && rating <= 1399) points = 3;
                else if (rating >= 1400 && rating <= 1599) points = 4;
                else if (rating >= 1600) points = 5;
                else points = 1; // Fallback
            }

            // Save Completion
            try {
                await prisma.exerciseCompletion.create({
                    data: {
                        userId: user.id,
                        exerciseId: exerciseId,
                        submissionId: sub.id,
                        contestId: sub.problem.contestId,
                        problemIndex: sub.problem.index,
                        problemName: sub.problem.name,
                        difficulty: sub.problem.rating,
                        type: type,
                        pointsAwarded: points,
                        completedAt: new Date(sub.creationTimeSeconds * 1000)
                    }
                });

                // Audit log? Optional, keeping DB clean.
                console.log(`[Checker] ✅ Awarded ${points} pts to ${user.codeforcesHandle} for problem ${sub.problem.contestId}${sub.problem.index} [${type}]`);

            } catch (err: any) {
                if (err.code === 'P2002') {
                    // Duplicate submission ID, ignore
                } else {
                    console.error('Error saving completion:', err);
                }
            }
        }

        // Update User High Water Mark
        await prisma.user.update({
            where: { id: user.id },
            data: { lastCheckedSubmissionId: maxProcessedId }
        });

    } catch (err) {
        console.error(`[Checker] Error processing user ${user.codeforcesHandle}:`, err);
    }
}
