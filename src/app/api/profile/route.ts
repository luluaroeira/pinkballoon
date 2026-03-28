import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { validateHandle } from '@/lib/codeforces';

// PUT /api/profile - Update user profile
export async function PUT(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { name, codeforcesHandle } = body;

        const updateData: any = {};

        if (name) {
            updateData.name = name;
        }

        if (codeforcesHandle) {
            // Check if handle is already in use by another user (case-insensitive)
            const allUsers = await prisma.user.findMany({ select: { id: true, codeforcesHandle: true } });
            const existingHandle = allUsers.find(
                u => u.codeforcesHandle.toLowerCase() === codeforcesHandle.toLowerCase() && u.id !== session.userId
            );
            if (existingHandle) {
                return NextResponse.json(
                    { error: 'Este handle do Codeforces já está cadastrado por outro usuário.' },
                    { status: 400 }
                );
            }

            const isValid = await validateHandle(codeforcesHandle);
            if (!isValid) {
                return NextResponse.json(
                    { error: 'Handle inválido no Codeforces. Verifique e tente novamente.' },
                    { status: 400 }
                );
            }
            updateData.codeforcesHandle = codeforcesHandle;
        }

        const user = await prisma.user.update({
            where: { id: session.userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                codeforcesHandle: true,
                role: true,
            }
        });

        return NextResponse.json({ user, message: 'Perfil atualizado! 🎈' });
    } catch (error) {
        console.error('Profile update error:', error);
        return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
    }
}
