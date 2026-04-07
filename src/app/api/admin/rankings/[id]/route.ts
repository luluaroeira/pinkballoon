import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

// DELETE /api/admin/rankings/[id]
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { id } = await params;
        const rankingId = Number(id);

        await prisma.ranking.delete({ where: { id: rankingId } });

        return NextResponse.json({ message: 'Ranking excluído com sucesso!' });
    } catch (error) {
        console.error('Error deleting ranking:', error);
        return NextResponse.json({ error: 'Erro ao excluir ranking' }, { status: 500 });
    }
}

// PUT /api/admin/rankings/[id] - Toggle active, update info
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { id } = await params;
        const rankingId = Number(id);
        const body = await request.json();

        const ranking = await prisma.ranking.update({
            where: { id: rankingId },
            data: {
                ...(body.name !== undefined && { name: body.name }),
                ...(body.description !== undefined && { description: body.description }),
                ...(body.isActive !== undefined && { isActive: body.isActive }),
            },
            include: { scoringPeriod: true }
        });

        return NextResponse.json({ message: 'Ranking atualizado!', ranking });
    } catch (error) {
        console.error('Error updating ranking:', error);
        return NextResponse.json({ error: 'Erro ao atualizar ranking' }, { status: 500 });
    }
}

// GET /api/admin/rankings/[id] - Get ranking details with members
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { id } = await params;
        const rankingId = Number(id);

        const ranking = await prisma.ranking.findUnique({
            where: { id: rankingId },
            include: {
                scoringPeriod: true,
                memberships: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                codeforcesHandle: true,
                            }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (!ranking) {
            return NextResponse.json({ error: 'Ranking não encontrado' }, { status: 404 });
        }

        return NextResponse.json({ ranking });
    } catch (error) {
        console.error('Error fetching ranking:', error);
        return NextResponse.json({ error: 'Erro ao buscar ranking' }, { status: 500 });
    }
}
