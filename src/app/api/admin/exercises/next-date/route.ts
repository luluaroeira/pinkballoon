import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET /api/admin/exercises/next-date?type=daily
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const type = request.nextUrl.searchParams.get('type') || 'daily';

        const exercises = await prisma.exercise.findMany({
            where: { type },
            select: { publishedAt: true },
        });

        const occupiedDates = new Set(
            exercises.map(ex => {
                const d = new Date(ex.publishedAt);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            })
        );

        // Start from tomorrow
        const candidate = new Date();
        candidate.setDate(candidate.getDate() + 1);
        candidate.setHours(0, 0, 0, 0);

        for (let i = 0; i < 365; i++) {
            const key = `${candidate.getFullYear()}-${String(candidate.getMonth() + 1).padStart(2, '0')}-${String(candidate.getDate()).padStart(2, '0')}`;
            if (!occupiedDates.has(key)) {
                break;
            }
            candidate.setDate(candidate.getDate() + 1);
        }

        // Return in format YYYY-MM-DDT00:00 for datetime-local input
        const pad = (n: number) => String(n).padStart(2, '0');
        const dateStr = `${candidate.getFullYear()}-${pad(candidate.getMonth() + 1)}-${pad(candidate.getDate())}T00:00`;

        return NextResponse.json({ nextDate: dateStr });
    } catch (error) {
        console.error('Next date error:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
