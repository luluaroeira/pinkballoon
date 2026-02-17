const CF_API_BASE = 'https://codeforces.com/api';

interface CFSubmission {
    id: number;
    contestId: number;
    problem: {
        contestId: number;
        index: string;
        name: string;
        rating?: number;
    };
    author: {
        participantType: string;
    };
    verdict: string;
    creationTimeSeconds: number;
}

interface CFContest {
    id: number;
    name: string;
    type: string;
    phase: string;
    startTimeSeconds: number;
    durationSeconds: number;
    relativeTimeSeconds?: number;
}

interface CFUser {
    handle: string;
    rating?: number;
    rank?: string;
}

async function cfFetch(endpoint: string, params: Record<string, string> = {}, retries = 3): Promise<any> {
    const url = new URL(`${CF_API_BASE}/${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url.toString(), {
                next: { revalidate: 0 },
                signal: AbortSignal.timeout(10000)
            });

            if (res.status === 429) {
                // Rate limited, wait with exponential backoff
                await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
                continue;
            }

            const data = await res.json();
            if (data.status === 'OK') return data.result;

            if (i < retries - 1) {
                await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
                continue;
            }
            throw new Error(data.comment || 'CF API error');
        } catch (error: any) {
            if (i === retries - 1) throw error;
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        }
    }
}

export async function validateHandle(handle: string): Promise<boolean> {
    try {
        const result = await cfFetch('user.info', { handles: handle });
        return Array.isArray(result) && result.length > 0;
    } catch {
        return false;
    }
}

export async function getUserInfo(handle: string): Promise<CFUser | null> {
    try {
        const result = await cfFetch('user.info', { handles: handle });
        return result?.[0] || null;
    } catch {
        return null;
    }
}

export async function getUserSubmissions(handle: string, count: number = 100, from: number = 1): Promise<CFSubmission[]> {
    try {
        const result = await cfFetch('user.status', { handle, count: String(count), from: String(from) });
        return result || [];
    } catch (e) {
        console.error(`Error fetching submissions for ${handle}:`, e);
        return [];
    }
}

export async function getUpcomingContests(): Promise<CFContest[]> {
    try {
        const result: CFContest[] = await cfFetch('contest.list', {});
        const now = Math.floor(Date.now() / 1000);
        const threeDaysLater = now + 3 * 24 * 60 * 60;

        return result
            .filter((c: CFContest) =>
                c.phase === 'BEFORE' &&
                c.startTimeSeconds >= now &&
                c.startTimeSeconds <= threeDaysLater
            )
            .sort((a: CFContest, b: CFContest) => a.startTimeSeconds - b.startTimeSeconds);
    } catch {
        return [];
    }
}

export async function checkSubmission(
    handle: string,
    contestId: number,
    problemIndex: string,
    publishedAtTimestamp: number,
    expiresAtTimestamp?: number,
    count: number = 100
): Promise<{ solved: boolean; submissionId?: number }> {
    const submissions = await getUserSubmissions(handle, count);

    for (const sub of submissions) {
        if (
            sub.problem.contestId === contestId &&
            sub.problem.index === problemIndex &&
            sub.verdict === 'OK' &&
            sub.creationTimeSeconds >= publishedAtTimestamp
        ) {
            // Check expiration
            if (expiresAtTimestamp && sub.creationTimeSeconds > expiresAtTimestamp) {
                continue;
            }
            return { solved: true, submissionId: sub.id };
        }
    }

    return { solved: false };
}

export type { CFSubmission, CFContest, CFUser };
