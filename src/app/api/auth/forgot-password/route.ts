import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';

// POST /api/auth/forgot-password
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
        }

        // Always return success to prevent email enumeration
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

        if (user) {
            // Protect admin account
            if (user.role === 'admin') {
                console.log(`Tentativa de reset de senha para ADMIN (${email}) bloqueada.`);
                return NextResponse.json({
                    message: 'Se o email estiver cadastrado, você receberá um link para redefinir sua senha.'
                });
            }

            // Invalidate previous tokens for this user
            await prisma.passwordResetToken.updateMany({
                where: { userId: user.id, used: false },
                data: { used: true },
            });

            // Generate secure token
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const nodeCrypto = require('node:crypto');
            const token = nodeCrypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

            await prisma.passwordResetToken.create({
                data: {
                    token,
                    userId: user.id,
                    expiresAt,
                },
            });

            // Send email (don't let email failures crash the request)
            try {
                await sendPasswordResetEmail(user.email, token, user.name);
            } catch (emailError) {
                console.error('Email send failed (token was still created):', emailError);
            }
        }

        // Always return success
        return NextResponse.json({
            message: 'Se o email estiver cadastrado, você receberá um link para redefinir sua senha.'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ error: 'Erro ao processar solicitação' }, { status: 500 });
    }
}
