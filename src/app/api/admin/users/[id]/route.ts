import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// PUT /api/admin/users/[id] - Reset user points (delete all completions)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { id } = await params;
        const userId = parseInt(id);

        // Prevent modifying admin
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) {
            return NextResponse.json({ error: 'Usuária não encontrada' }, { status: 404 });
        }
        if (targetUser.role === 'admin') {
            return NextResponse.json({ error: 'Não é possível zerar pontos da conta admin. 🔒' }, { status: 403 });
        }

        const body = await request.json();
        const { action } = body;

        if (action === 'reset-points') {
            // Delete all completions for this user
            const deleted = await prisma.exerciseCompletion.deleteMany({
                where: { userId },
            });

            // Also reset the lastCheckedSubmissionId so checker re-evaluates
            await prisma.user.update({
                where: { id: userId },
                data: { lastCheckedSubmissionId: null },
            });

            // Log the action
            await prisma.auditLog.create({
                data: {
                    action: 'RESET_USER_POINTS',
                    details: `Pontos zerados para ${targetUser.name} (${targetUser.codeforcesHandle}). ${deleted.count} conclusões removidas.`,
                    userId: session.userId,
                },
            });

            return NextResponse.json({
                message: `Pontos de ${targetUser.name} zerados! ${deleted.count} conclusão(ões) removida(s). 🗑️`,
            });
        }

        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    } catch (error) {
        console.error('Admin user update error:', error);
        return NextResponse.json({ error: 'Erro ao atualizar usuária' }, { status: 500 });
    }
}

// DELETE /api/admin/users/[id] - Delete user and all their data
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { id } = await params;
        const userId = parseInt(id);

        // Prevent deleting admin
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) {
            return NextResponse.json({ error: 'Usuária não encontrada' }, { status: 404 });
        }
        if (targetUser.role === 'admin') {
            return NextResponse.json({ error: 'Não é possível excluir a conta admin. 🔒' }, { status: 403 });
        }

        // Delete in order: completions, reset tokens, then user
        await prisma.$transaction([
            prisma.exerciseCompletion.deleteMany({ where: { userId } }),
            prisma.passwordResetToken.deleteMany({ where: { userId } }),
            prisma.user.delete({ where: { id: userId } }),
        ]);

        // Log the action
        await prisma.auditLog.create({
            data: {
                action: 'DELETE_USER',
                details: `Usuária removida: ${targetUser.name} (${targetUser.email}, CF: ${targetUser.codeforcesHandle})`,
                userId: session.userId,
            },
        });

        return NextResponse.json({
            message: `Usuária ${targetUser.name} removida com sucesso. 🗑️`,
        });
    } catch (error) {
        console.error('Admin user delete error:', error);
        return NextResponse.json({ error: 'Erro ao excluir usuária' }, { status: 500 });
    }
}
