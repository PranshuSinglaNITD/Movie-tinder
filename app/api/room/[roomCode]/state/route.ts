import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/middleware/redis';

export async function GET(req: NextRequest, { params }: { params: Promise<{ roomCode: string }> }) {
  try {
    const { roomCode } = await params;
    const email = req.nextUrl.searchParams.get('email'); 
    
    const roomKey = `room:${roomCode}`;
    const logsKey = `room-logs:${roomCode}`;
    const userIndexKey = `room-user-index:${roomCode}`;

    const moviePoolStr = await redis.hget(roomKey, 'moviePool');
    const roomVibeStr = await redis.hget(roomKey, 'roomVibe');
    // NEW: Fetch the official participants list
    const participantsStr = await redis.hget(roomKey, 'participants'); 

    const logs = await redis.lrange(logsKey, 0, 49);

    let currentIndex = 0;
    if (email) {
      const savedIndex = await redis.hget(userIndexKey, email);
      if (savedIndex) {
        currentIndex = parseInt(savedIndex as string, 10);
      }
    }

    return NextResponse.json({
      success: true,
      moviePool: moviePoolStr ? JSON.parse(moviePoolStr) : [],
      roomContext: roomVibeStr ? JSON.parse(roomVibeStr) : null,
      participants: participantsStr ? JSON.parse(participantsStr) : [], // NEW
      logs: logs || [], 
      currentIndex      
    });
  } catch (error) {
    console.error("State API Error:", error);
    return NextResponse.json({ error: 'Failed to fetch state' }, { status: 500 });
  }
}