import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/rankings - List all active rankings for users to browse/join
export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const rankings = await prisma.ranking.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            include: {
                scoringPeriod: true,
                memberships: {
                    where: { status: 'approved' },
                    select: { id: true }
                },
            }
        });

        // Also get current user's memberships so they know their status
        const myMemberships = await prisma.rankingMembership.findMany({
            where: { userId: session.userId },
            select: {
                rankingId: true,
                status: true,
                id: true,
            }
        });

        const myMembershipMap: Record<number, { status: string; id: number }> = {};
        myMemberships.forEach(m => {
            myMembershipMap[m.rankingId] = { status: m.status, id: m.id };
        });

        const result = rankings.map(r => ({
            id: r.id,
            name: r.name,
            description: r.description,
            scoringPeriod: {
                id: r.scoringPeriod.id,
                name: r.scoringPeriod.name,
                startDate: r.scoringPeriod.startDate,
                endDate: r.scoringPeriod.endDate,
            },
            memberCount: r.memberships.length,
            myStatus: myMembershipMap[r.id]?.status || null, // null, "pending", "approved", "rejected"
            myMembershipId: myMembershipMap[r.id]?.id || null,
            createdAt: r.createdAt,
        }));

        return NextResponse.json({ rankings: result });
    } catch (error) {
        console.error('Error fetching rankings:', error);
        return NextResponse.json({ error: 'Erro ao buscar rankings' }, { status: 500 });
    }
}
