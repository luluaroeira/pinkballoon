import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, generateToken } from '@/lib/auth';
import { validateHandle } from '@/lib/codeforces';

// POST /api/auth/register
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, password, codeforcesHandle } = body;

        if (!name || !email || !password || !codeforcesHandle) {
            return NextResponse.json(
                { error: 'Todos os campos são obrigatórios.' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'A senha deve ter pelo menos 6 caracteres.' },
                { status: 400 }
            );
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json(
                { error: 'Este email já está cadastrado.' },
                { status: 400 }
            );
        }

        // Check if Codeforces handle is already in use (case-insensitive)
        const existingHandles = await prisma.$queryRaw<{ id: number }[]>`
            SELECT id FROM User WHERE LOWER(codeforcesHandle) = LOWER(${codeforcesHandle}) LIMIT 1
        `;
        if (existingHandles.length > 0) {
            return NextResponse.json(
                { error: 'Este handle do Codeforces já está cadastrado por outro usuário.' },
                { status: 400 }
            );
        }

        // Validate Codeforces handle
        const isValidHandle = await validateHandle(codeforcesHandle);
        if (!isValidHandle) {
            return NextResponse.json(
                { error: 'Handle inválido no Codeforces. Verifique e tente novamente.' },
                { status: 400 }
            );
        }

        // Hash password and create user
        const hashedPassword = await hashPassword(password);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                codeforcesHandle,
            }
        });

        // Generate JWT
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        const response = NextResponse.json({
            message: 'Cadastro realizado com sucesso! 🎈',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                codeforcesHandle: user.codeforcesHandle,
                role: user.role,
            }
        });

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Register error:', error);
        return NextResponse.json(
            { error: 'Erro interno. Tente novamente.' },
            { status: 500 }
        );
    }
}
