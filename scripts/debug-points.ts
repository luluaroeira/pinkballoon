import prisma from '../src/lib/prisma';

async function main() {
    // Get Iasmim and Cibelly's completions
    const users = await prisma.user.findMany({
        where: {
            codeforcesHandle: { in: ['iasmimqf', 'cibelindaa'] }
        },
        select: {
            id: true,
            name: true,
            codeforcesHandle: true,
            completions: {
                orderBy: { completedAt: 'asc' },
                select: {
                    id: true,
                    pointsAwarded: true,
                    completedAt: true,
                    type: true,
                    contestId: true,
                    problemIndex: true,
                    problemName: true,
                    exerciseId: true,
                    submissionId: true,
                    difficulty: true,
                }
            }
        }
    });

    // Also get the active scoring period
    const activePeriod = await prisma.scoringPeriod.findFirst({
        where: { isActive: true }
    });
    console.log('\n=== Active Scoring Period ===');
    console.log(activePeriod);

    for (const user of users) {
        console.log(`\n=== ${user.name} (${user.codeforcesHandle}) ===`);
        console.log(`Total completions: ${user.completions.length}`);
        const totalPoints = user.completions.reduce((s, c) => s + c.pointsAwarded, 0);
        console.log(`Total points: ${totalPoints}`);

        for (const c of user.completions) {
            console.log(`  [${c.id}] ${c.type} | contest=${c.contestId} problem=${c.problemIndex} "${c.problemName}" | points=${c.pointsAwarded} | difficulty=${c.difficulty} | exerciseId=${c.exerciseId} | completedAt=${c.completedAt.toISOString()} | submissionId=${c.submissionId}`);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
