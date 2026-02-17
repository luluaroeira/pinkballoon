import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession, verifyPassword, hashPassword } from '@/lib/auth';

// PUT /api/profile/password - Change password (authenticated)
export async function PUT(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Senha atual e nova senha são obrigatórias' }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'A nova senha deve ter no mínimo 6 caracteres' }, { status: 400 });
        }

        // Prevent admin password change
        if (session.role === 'admin') {
            return NextResponse.json({ error: 'A conta de ADMIN não pode alterar a senha! 🔒' }, { status: 403 });
        }
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
        });

        if (!user) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        // Verify current password
        const isValid = await verifyPassword(currentPassword, user.password);
        if (!isValid) {
            return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 });
        }

        // Hash and update
        const hashedPassword = await hashPassword(newPassword);
        await prisma.user.update({
            where: { id: session.userId },
            data: { password: hashedPassword },
        });

        return NextResponse.json({ message: 'Senha alterada com sucesso! 🎈' });
    } catch (error) {
        console.error('Change password error:', error);
        return NextResponse.json({ error: 'Erro ao alterar senha' }, { status: 500 });
    }
}
