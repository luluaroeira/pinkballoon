// Cron scheduler for exercise checking
// Run this separately: npx ts-node src/cron.ts (or via npm script)
import cron from 'node-cron';

const CHECKER_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function triggerChecker() {
    console.log(`[Cron] Triggering checker at ${new Date().toISOString()}`);
    try {
        const res = await fetch(`${CHECKER_URL}/api/checker`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-cron-secret': process.env.CRON_SECRET || 'pinkballoon_secret_key_123'
            },
        });
        const data = await res.json();
        console.log('[Cron] Result:', data);
    } catch (error) {
        console.error('[Cron] Error:', error);
    }
}

// Run every 10 minutes
cron.schedule('*/10 * * * *', () => {
    triggerChecker();
});

console.log('🕐 PinkBalloon Cron Scheduler started (every 10 minutes)');
console.log('Press Ctrl+C to stop.');
