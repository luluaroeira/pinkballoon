import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { runExerciseChecker } from '@/lib/checker';

// POST /api/checker - manually trigger (admin) or automated (cron)
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

        await runExerciseChecker();

        return NextResponse.json({ message: 'Verificação concluída com sucesso!' });
    } catch (error) {
        console.error('Checker error:', error);
        return NextResponse.json({ error: 'Erro ao executar verificação' }, { status: 500 });
    }
}
