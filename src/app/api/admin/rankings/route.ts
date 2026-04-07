import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/admin/rankings - List all rankings with membership counts
export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const rankings = await prisma.ranking.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                scoringPeriod: true,
                memberships: {
                    include: {
                        user: {
                            select: { id: true, name: true, codeforcesHandle: true }
                        }
                    }
                }
            }
        });

        return NextResponse.json({ rankings });
    } catch (error) {
        console.error('Error fetching rankings:', error);
        return NextResponse.json({ error: 'Erro ao buscar rankings' }, { status: 500 });
    }
}

// POST /api/admin/rankings - Create a new ranking
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { name, description, scoringPeriodId } = body;

        if (!name || !scoringPeriodId) {
            return NextResponse.json({ error: 'Nome e período são obrigatórios' }, { status: 400 });
        }

        // Verify the scoring period exists
        const period = await prisma.scoringPeriod.findUnique({
            where: { id: Number(scoringPeriodId) }
        });

        if (!period) {
            return NextResponse.json({ error: 'Período não encontrado' }, { status: 404 });
        }

        const ranking = await prisma.ranking.create({
            data: {
                name,
                description: description || null,
                scoringPeriodId: Number(scoringPeriodId),
            },
            include: {
                scoringPeriod: true,
            }
        });

        return NextResponse.json({ message: 'Ranking criado com sucesso!', ranking });
    } catch (error) {
        console.error('Error creating ranking:', error);
        return NextResponse.json({ error: 'Erro ao criar ranking' }, { status: 500 });
    }
}
