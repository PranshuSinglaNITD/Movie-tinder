import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/middleware/redis';

export async function GET(req: NextRequest, { params }: { params: Promise<{ roomCode: string }> }) {
  try {
    const { roomCode } = await params;
    const scoresKey = `room-scores:${roomCode}`;

    // Fetch all current scores from the Redis Hash
    const allScores = await redis.hgetall(scoresKey);
    
    // Format into an array and sort from highest to lowest
    const leaderboard = Object.entries(allScores || {})
      .map(([title, score]) => ({ title, score: parseInt(score as string, 10) }))
      .sort((a, b) => b.score - a.score);

    return NextResponse.json({ success: true, leaderboard });
  } catch (error) {
    console.error("Results API Error:", error);
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}