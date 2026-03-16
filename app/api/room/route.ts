import { NextResponse } from 'next/server';
import { redis } from '@/middleware/redis';
import { getServerSession } from 'next-auth';

// Helper function to generate a 6-character room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hostEmail = session.user.email;
    const roomCode = generateRoomCode();
    const roomKey = `room:${roomCode}`;

    // Initialize the room state in Redis
    const roomData = {
      host: hostEmail,
      status: 'waiting',
      participants: JSON.stringify([hostEmail]),
      moviePrompts: JSON.stringify([]),
    };

    // Store in Redis and set it to expire in 4 hours (14400 seconds)
    await redis.hset(roomKey, roomData);
    await redis.expire(roomKey, 14400);

    return NextResponse.json({ roomCode, message: 'Room created successfully' });
    
  } catch (error) {
    console.error('Redis Room Creation Error:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}