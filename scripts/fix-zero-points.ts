import prisma from '../src/lib/prisma';

async function main() {
    // Find all completions with 0 points
    const zeroPointCompletions = await prisma.exerciseCompletion.findMany({
        where: { pointsAwarded: 0 },
        include: { user: { select: { name: true, codeforcesHandle: true } } }
    });

    console.log(`Found ${zeroPointCompletions.length} completions with 0 points:\n`);

    for (const c of zeroPointCompletions) {
        // Calculate what the points should be based on current logic
        const rating = c.difficulty || 0;
        let correctPoints: number;

        if (rating >= 1800) correctPoints = 5;
        else if (rating >= 1600) correctPoints = 4;
        else if (rating >= 1400) correctPoints = 3;
        else if (rating >= 1200) correctPoints = 2;
        else correctPoints = 1; // unrated or < 1200

        console.log(`  [${c.id}] ${c.user.codeforcesHandle} | contest=${c.contestId} problem=${c.problemIndex} "${c.problemName}" | difficulty=${c.difficulty} | was 0 pts → should be ${correctPoints} pts`);

        await prisma.exerciseCompletion.update({
            where: { id: c.id },
            data: { pointsAwarded: correctPoints }
        });
    }

    console.log(`\n✅ Fixed ${zeroPointCompletions.length} completions.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
