import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { runExerciseChecker } from '@/lib/checker';

// Allow up to 60s for the checker to complete (Vercel default is 10s)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// GET /api/checker - Vercel Cron Jobs
// Vercel sends: Authorization: Bearer <CRON_SECRET>
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        // If CRON_SECRET is configured, verify it
        if (cronSecret) {
            if (authHeader !== `Bearer ${cronSecret}`) {
                console.warn('[Cron GET] Unauthorized: invalid Bearer token');
                return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
            }
        } else {
            // No CRON_SECRET configured - accept Vercel Cron user-agent OR the fallback
            const userAgent = request.headers.get('user-agent') || '';
            const fallbackSecret = 'pinkballoon_secret_key_123';
            if (!userAgent.includes('vercel-cron') && authHeader !== `Bearer ${fallbackSecret}`) {
                console.warn('[Cron GET] Unauthorized: no CRON_SECRET and not vercel-cron UA');
                return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
            }
        }

        console.log(`[Cron GET] Exercise check triggered at ${new Date().toISOString()}`);
        const startTime = Date.now();
        const result = await runExerciseChecker();
        const elapsed = Date.now() - startTime;

        console.log(`[Cron GET] Completed in ${elapsed}ms`);

        return NextResponse.json({
            ok: true,
            message: `Verificação concluída em ${(elapsed / 1000).toFixed(1)}s! ✅`,
            ...result,
            elapsedMs: elapsed,
        });
    } catch (error: any) {
        console.error('[Cron GET] Error:', error);
        return NextResponse.json({ error: `Erro: ${error.message}` }, { status: 500 });
    }
}

// POST /api/checker - manually trigger (admin) or automated (local cron)
export async function POST(request: NextRequest) {
    try {
        // Check for cron secret
        const cronSecret = request.headers.get('x-cron-secret');
        const validSecret = process.env.CRON_SECRET || 'pinkballoon_secret_key_123';

        const isCron = cronSecret === validSecret;

        // Check for admin session
        const session = await getSession();
        const isAdmin = session?.role === 'admin';

        if (!isAdmin && !isCron) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        console.log(`[Checker POST] Manual check triggered at ${new Date().toISOString()}`);
        const startTime = Date.now();
        const result = await runExerciseChecker();
        const elapsed = Date.now() - startTime;

        return NextResponse.json({
            ok: true,
            message: `Verificação concluída em ${(elapsed / 1000).toFixed(1)}s! ✅`,
            ...result,
            elapsedMs: elapsed,
        });
    } catch (error: any) {
        console.error('[Checker POST] Error:', error);
        return NextResponse.json({ error: `Erro: ${error.message}` }, { status: 500 });
    }
}
