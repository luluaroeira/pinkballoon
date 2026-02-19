import prisma from './src/lib/prisma';

async function main() {
    // 1. Delete the 2 completions we just created (wrong ones)
    const deleted = await prisma.exerciseCompletion.deleteMany({
        where: { userId: 3 }
    });
    console.log(`Deleted ${deleted.count} completions.`);

    // 2. Reset lastCheckedSubmissionId to null so checker re-processes EVERYTHING
    await prisma.user.update({
        where: { id: 3 },
        data: { lastCheckedSubmissionId: null }
    });
    console.log('Reset lastCheckedSubmissionId to null (will re-import full history)');
    console.log('');
    console.log('Now run the checker. It will:');
    console.log('- Re-import ALL old submissions (completedAt = original date)');
    console.log('- Old completions wont show in dashboard (outside active period)');
    console.log('- Watermelon will be marked as "already solved"');
    console.log('- Only truly NEW problems will earn points going forward');

    await prisma["$disconnect"]();
}
main();
