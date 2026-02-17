import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET /api/exercises - Get exercises for the current user
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type'); // 'daily', 'weekly', or null for all

        const now = new Date();
        const where: any = {
            publishedAt: { lte: now },
        };

        if (type) {
            where.type = type;
        }

        const exercises = await prisma.exercise.findMany({
            where,
            orderBy: { publishedAt: 'desc' },
            take: 20,
            include: {
                completions: {
                    where: { userId: session.userId },
                    select: {
                        id: true,
                        completedAt: true,
                        pointsAwarded: true,
                    }
                }
            }
        });

        const result = exercises.map(ex => ({
            ...ex,
            completed: ex.completions.length > 0,
            completionData: ex.completions[0] || null,
            expired: ex.expiresAt ? new Date(ex.expiresAt) < now : false,
        }));

        return NextResponse.json({ exercises: result });
    } catch (error) {
        console.error('Get exercises error:', error);
        return NextResponse.json({ error: 'Erro ao buscar exercícios' }, { status: 500 });
    }
}
