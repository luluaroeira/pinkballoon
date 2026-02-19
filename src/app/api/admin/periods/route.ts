import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/admin/periods
export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
        }

        const periods = await prisma.scoringPeriod.findMany({
            orderBy: { startDate: 'desc' }
        });
        return NextResponse.json(periods);
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao buscar periodos' }, { status: 500 });
    }
}

// POST /api/admin/periods
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { name, startDate, endDate } = body;

        if (!name || !startDate || !endDate) {
            return NextResponse.json({ error: 'Campos obrigatorios faltando' }, { status: 400 });
        }

        const period = await prisma.scoringPeriod.create({
            data: {
                name,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                isActive: false // Default inactive
            }
        });

        return NextResponse.json(period);
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao criar periodo' }, { status: 500 });
    }
}

// PUT /api/admin/periods - Toggle active status or delete (via query param?)
// Let's create a separate route for ID operations if needed, or handle here.
// But better use dynamic route [id].
