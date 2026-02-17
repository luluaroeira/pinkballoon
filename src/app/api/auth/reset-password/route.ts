import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

// POST /api/auth/reset-password
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token, password } = body;

        if (!token || !password) {
            return NextResponse.json({ error: 'Token e nova senha são obrigatórios' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'A senha deve ter no mínimo 6 caracteres' }, { status: 400 });
        }

        // Find valid token
        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!resetToken) {
            return NextResponse.json({ error: 'Link inválido ou expirado. Solicite um novo.' }, { status: 400 });
        }

        if (resetToken.used) {
            return NextResponse.json({ error: 'Este link já foi utilizado. Solicite um novo.' }, { status: 400 });
        }


        if (resetToken.expiresAt < new Date()) {
            return NextResponse.json({ error: 'Este link expirou. Solicite um novo.' }, { status: 400 });
        }

        // DOUBLE CHECK: Protect admin account
        if (resetToken.user.role === 'admin') {
            return NextResponse.json({ error: 'Conta de ADMIN não pode ser redefinida. 🔒' }, { status: 403 });
        }

        // Hash new password and update user
        const hashedPassword = await hashPassword(password);

        await prisma.$transaction([
            prisma.user.update({
                where: { id: resetToken.userId },
                data: { password: hashedPassword },
            }),
            prisma.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { used: true },
            }),
        ]);

        return NextResponse.json({ message: 'Senha redefinida com sucesso! Faça login com sua nova senha. 🎈' });
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json({ error: 'Erro ao redefinir senha' }, { status: 500 });
    }
}
