import { runExerciseChecker } from './checker';

// In-memory tracker for when the checker last ran.
// On Vercel serverless, this resets per cold start, but that's fine —
// it just means the checker may run a bit more often, never less.
let lastCheckerRun = 0;
let checkerRunning = false;

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * If the checker hasn't run in the last 10 minutes, run it now.
 * Returns true if the checker was triggered, false if skipped.
 * This is non-blocking when used with Next.js `after()`.
 */
export async function maybeRunChecker(): Promise<boolean> {
    const now = Date.now();

    // Skip if ran recently or already running
    if (now - lastCheckerRun < CHECK_INTERVAL_MS || checkerRunning) {
        return false;
    }

    checkerRunning = true;
    lastCheckerRun = now; // Set immediately to prevent concurrent triggers

    try {
        console.log('[AutoChecker] Triggering exercise check (last run was >10min ago)...');
        const result = await runExerciseChecker();
        console.log(`[AutoChecker] Done. ${result.newCompletions} new completions.`);
        return true;
    } catch (err) {
        console.error('[AutoChecker] Error:', err);
        return false;
    } finally {
        checkerRunning = false;
    }
}
