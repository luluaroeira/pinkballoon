import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

// PUT /api/admin/periods/[id] - Toggle active or update
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
        }

        const { id: idStr } = await params;
        const id = parseInt(idStr);
        const { isActive, name, startDate, endDate } = await request.json();

        // If setting as active, deactivate all others first
        if (isActive === true) {
            await prisma.scoringPeriod.updateMany({
                where: { id: { not: id } },
                data: { isActive: false }
            });
        }

        const updated = await prisma.scoringPeriod.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(startDate && { startDate: new Date(startDate + 'T12:00:00Z') }),
                ...(endDate && { endDate: new Date(endDate + 'T12:00:00Z') }),
                ...(isActive !== undefined && { isActive })
            }
        });

        return NextResponse.json(updated);
    } catch (e) {
        console.error('Period update error:', e);
        return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
    }
}

// DELETE
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
        }
        const { id } = await params;
        const periodId = parseInt(id);

        // Check force flag
        const { searchParams } = new URL(request.url);
        const force = searchParams.get('force') === 'true';

        // Check if period has rankings associated
        const rankingsCount = await prisma.ranking.count({ where: { scoringPeriodId: periodId } });

        if (rankingsCount > 0 && !force) {
            return NextResponse.json(
                {
                    error: `Este período possui ${rankingsCount} ranking(s) associado(s). Deseja excluir tudo?`,
                    hasRankings: true,
                    rankingsCount,
                },
                { status: 409 }
            );
        }

        // If force, delete associated rankings first (memberships cascade automatically)
        if (rankingsCount > 0 && force) {
            await prisma.ranking.deleteMany({ where: { scoringPeriodId: periodId } });
        }

        await prisma.scoringPeriod.delete({ where: { id: periodId } });
        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Period delete error:', e);
        if (e?.code === 'P2003') {
            return NextResponse.json(
                { error: 'Não é possível excluir: período possui dados associados. Tente novamente com a opção de forçar.' },
                { status: 400 }
            );
        }
        return NextResponse.json({ error: 'Erro ao deletar período.' }, { status: 500 });
    }
}
