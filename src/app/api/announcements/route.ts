import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET /api/announcements
export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const announcements = await prisma.announcement.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        return NextResponse.json({ announcements });
    } catch (error) {
        console.error('Announcements error:', error);
        return NextResponse.json({ error: 'Erro ao buscar avisos' }, { status: 500 });
    }
}
