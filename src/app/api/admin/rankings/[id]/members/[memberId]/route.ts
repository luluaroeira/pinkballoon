import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

// PUT /api/admin/rankings/[id]/members/[memberId] - Accept/reject membership
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; memberId: string }> }
) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { memberId } = await params;
        const membershipId = Number(memberId);
        const body = await request.json();
        const { status } = body; // "approved" or "rejected"

        if (!['approved', 'rejected'].includes(status)) {
            return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
        }

        const membership = await prisma.rankingMembership.update({
            where: { id: membershipId },
            data: { status },
            include: {
                user: { select: { name: true } }
            }
        });

        const action = status === 'approved' ? 'aprovada' : 'rejeitada';
        return NextResponse.json({
            message: `Solicitação de ${membership.user.name} ${action}!`,
            membership,
        });
    } catch (error) {
        console.error('Error updating membership:', error);
        return NextResponse.json({ error: 'Erro ao atualizar solicitação' }, { status: 500 });
    }
}

// DELETE /api/admin/rankings/[id]/members/[memberId] - Remove member
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; memberId: string }> }
) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { memberId } = await params;
        const membershipId = Number(memberId);

        await prisma.rankingMembership.delete({
            where: { id: membershipId }
        });

        return NextResponse.json({ message: 'Membro removido!' });
    } catch (error) {
        console.error('Error removing member:', error);
        return NextResponse.json({ error: 'Erro ao remover membro' }, { status: 500 });
    }
}
