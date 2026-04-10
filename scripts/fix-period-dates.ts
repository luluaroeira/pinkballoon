import prisma from '../src/lib/prisma';

async function main() {
    const periods = await prisma.scoringPeriod.findMany();

    console.log('=== Fixing Scoring Period dates ===\n');

    for (const p of periods) {
        const startHour = p.startDate.getUTCHours();
        const endHour = p.endDate.getUTCHours();

        console.log(`[${p.id}] "${p.name}"`);
        console.log(`  Before: ${p.startDate.toISOString()} → ${p.endDate.toISOString()}`);

        // If stored at midnight UTC, shift to noon UTC
        const newStart = startHour === 0
            ? new Date(p.startDate.getTime() + 12 * 60 * 60 * 1000)
            : p.startDate;
        const newEnd = endHour === 0
            ? new Date(p.endDate.getTime() + 12 * 60 * 60 * 1000)
            : p.endDate;

        if (startHour === 0 || endHour === 0) {
            await prisma.scoringPeriod.update({
                where: { id: p.id },
                data: { startDate: newStart, endDate: newEnd }
            });
            console.log(`  After:  ${newStart.toISOString()} → ${newEnd.toISOString()} ✅`);
        } else {
            console.log(`  Already OK (not midnight UTC), skipping.`);
        }
    }

    console.log('\n✅ Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
