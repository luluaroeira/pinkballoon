import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

// GET /api/admin/exercises/preview?contestId=123&index=A
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const contestId = searchParams.get('contestId');
        const index = searchParams.get('index');

        if (!contestId || !index) {
            return NextResponse.json({ error: 'Faltando dados' }, { status: 400 });
        }

        // Fetch contest details from Codeforces
        const res = await fetch(`https://codeforces.com/api/contest.standings?contestId=${contestId}&from=1&count=1`);
        const data = await res.json();

        if (data.status !== 'OK') {
            return NextResponse.json({ error: 'Contest não encontrado ou erro na API do CF' }, { status: 404 });
        }

        const problems = data.result.problems as { index: string, name: string }[];
        const problem = problems.find(p => p.index.toUpperCase() === index.toUpperCase());

        if (!problem) {
            return NextResponse.json({ error: `Problema ${index} não encontrado no contest ${contestId}` }, { status: 404 });
        }

        return NextResponse.json({ name: problem.name });

    } catch (error) {
        console.error('Preview error:', error);
        return NextResponse.json({ error: 'Erro interno ao buscar preview' }, { status: 500 });
    }
}
