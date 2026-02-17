import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET /api/admin/announcements - List all announcements
export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const announcements = await prisma.announcement.findMany({
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ announcements });
    } catch (error) {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}

// POST /api/admin/announcements - Create announcement
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { content } = await request.json();
        if (!content) {
            return NextResponse.json({ error: 'Conteúdo é obrigatório' }, { status: 400 });
        }

        const announcement = await prisma.announcement.create({
            data: { content }
        });

        return NextResponse.json({ announcement, message: 'Aviso publicado! 🎈' });
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao criar aviso' }, { status: 500 });
    }
}
