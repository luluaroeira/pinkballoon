import { NextResponse } from 'next/server';
import { getUpcomingContests } from '@/lib/codeforces';

let cachedContests: any[] | null = null;
let lastFetch: number = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache

// GET /api/contests
export async function GET() {
    try {
        const now = Date.now();

        if (!cachedContests || now - lastFetch > CACHE_TTL) {
            cachedContests = await getUpcomingContests();
            lastFetch = now;
        }

        return NextResponse.json({ contests: cachedContests });
    } catch (error) {
        console.error('Contests error:', error);
        return NextResponse.json({ contests: cachedContests || [] });
    }
}
