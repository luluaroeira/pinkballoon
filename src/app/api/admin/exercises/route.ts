import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET /api/admin/exercises - List all exercises (admin)
export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const exercises = await prisma.exercise.findMany({
            orderBy: { publishedAt: 'desc' },
            include: {
                completions: {
                    include: {
                        user: {
                            select: { name: true, codeforcesHandle: true }
                        }
                    }
                }
            }
        });

        return NextResponse.json({ exercises });
    } catch (error) {
        console.error('Admin exercises error:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}

// Helper: find the next free day starting from tomorrow
async function getNextFreeDate(type: string): Promise<Date> {
    // Get all exercises grouped by their publishedAt date
    const exercises = await prisma.exercise.findMany({
        where: { type },
        select: { publishedAt: true },
        orderBy: { publishedAt: 'asc' },
    });

    // Build a set of occupied dates (YYYY-MM-DD format)
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

    // Find the next free day (check up to 365 days ahead)
    for (let i = 0; i < 365; i++) {
        const key = `${candidate.getFullYear()}-${String(candidate.getMonth() + 1).padStart(2, '0')}-${String(candidate.getDate()).padStart(2, '0')}`;
        if (!occupiedDates.has(key)) {
            return candidate;
        }
        candidate.setDate(candidate.getDate() + 1);
    }

    return candidate; // fallback: 365 days from now
}

// POST /api/admin/exercises - Create new exercise
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { type, contestId, problemIndex, title, description, points, publishedAt } = body;

        if (!type || !contestId || !problemIndex || !points) {
            return NextResponse.json({ error: 'Campos obrigatórios: type, contestId, problemIndex, points' }, { status: 400 });
        }

        if (!['daily', 'weekly'].includes(type)) {
            return NextResponse.json({ error: 'Tipo deve ser "daily" ou "weekly"' }, { status: 400 });
        }

        // Calculate publishedAt: use provided date or next free day
        let pubDate: Date;
        if (publishedAt) {
            pubDate = new Date(publishedAt);
        } else {
            pubDate = await getNextFreeDate(type);
        }

        // Calculate expiresAt automatically based on type
        const expiresAt = new Date(pubDate);
        if (type === 'daily') {
            expiresAt.setHours(expiresAt.getHours() + 24); // +24 hours
        } else {
            expiresAt.setDate(expiresAt.getDate() + 7); // +7 days
        }

        const exercise = await prisma.exercise.create({
            data: {
                type,
                contestId: parseInt(contestId),
                problemIndex: problemIndex.toUpperCase(),
                title: title || null,
                description: description || null,
                points: parseInt(points),
                publishedAt: pubDate,
                expiresAt,
            }
        });

        await prisma.auditLog.create({
            data: {
                action: 'EXERCISE_CREATED',
                details: `Admin created exercise #${exercise.id}: ${type} - CF ${contestId}${problemIndex} (${points} pts)`,
                userId: session.userId,
                exerciseId: exercise.id,
            }
        });

        return NextResponse.json({ exercise, message: 'Exercício criado com sucesso! 🎈' });
    } catch (error) {
        console.error('Create exercise error:', error);
        return NextResponse.json({ error: 'Erro ao criar exercício' }, { status: 500 });
    }
}
