import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// DELETE /api/admin/announcements/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { id } = await params;
        await prisma.announcement.delete({
            where: { id: parseInt(id) }
        });

        return NextResponse.json({ message: 'Aviso removido!' });
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao remover aviso' }, { status: 500 });
    }
}
