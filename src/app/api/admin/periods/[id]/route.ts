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
                ...(startDate && { startDate: new Date(startDate) }),
                ...(endDate && { endDate: new Date(endDate) }),
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
        await prisma.scoringPeriod.delete({ where: { id: parseInt(id) } });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Period delete error:', e);
        return NextResponse.json({ error: 'Erro ao deletar' }, { status: 500 });
    }
}
