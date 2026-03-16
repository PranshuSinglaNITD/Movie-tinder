import { NextResponse } from 'next/server';
import { redis, redisPublisher } from '@/middleware/redis';

export async function POST(req: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  try {
    const { roomCode } = await params;
    const { action, payload } = await req.json();
    
    const roomKey = `room:${roomCode}`;
    const scoresKey = `room-scores:${roomCode}`;
    const logsKey = `room-logs:${roomCode}`;            
    const userIndexKey = `room-user-index:${roomCode}`; 

    if (action === "USER_JOINED") {
      const existingStr = await redis.hget(roomKey, 'participants');
      let participants: string[] = existingStr ? JSON.parse(existingStr) : [];

      if (!participants.includes(payload.email)) {
        participants.push(payload.email);
        await redis.hset(roomKey, 'participants', JSON.stringify(participants));
        
        // NEW: Save the join action to the permanent log history
        await redis.lpush(logsKey, `🟢 ${payload.name} joined the room`);
        await redis.ltrim(logsKey, 0, 49); // Keep only the last 50 messages so memory doesn't bloat
      }
      else{
        window.alert(`${payload.name} already exists in room with code ${roomCode}`)
      }

      const eventMessage = JSON.stringify({ 
        action: "USER_JOINED", 
        payload: { email: payload.email, name: payload.name, allParticipants: participants } 
      });
      await redisPublisher.publish(`room-events:${roomCode}`, eventMessage);

      return NextResponse.json({ success: true, allParticipants: participants });
    }

    if (action === "SWIPE") {
      // 1. Tally the movie score
      if (payload.direction === "RIGHT") {
        await redis.hincrby(scoresKey, payload.movieTitle, 1);
      } else {
        await redis.hincrby(scoresKey, payload.movieTitle, 0); 
      }

      // 2. NEW: Increment this specific user's personal swipe counter
      await redis.hincrby(userIndexKey, payload.email, 1);

      // 3. NEW: Save the swipe to the permanent log history
      const swipeIcon = payload.direction === "RIGHT" ? "👍" : "👎";
      await redis.lpush(logsKey, `${swipeIcon} ${payload.userName} swiped ${payload.direction} on ${payload.movieTitle}`);
      await redis.ltrim(logsKey, 0, 49); 

      const allScores = await redis.hgetall(scoresKey);
      const leaderboard = Object.entries(allScores || {})
        .map(([title, score]) => ({ title, score: parseInt(score as string, 10) }))
        .sort((a, b) => b.score - a.score);

      await redisPublisher.publish(`room-events:${roomCode}`, JSON.stringify({ 
        action: "SWIPE", payload, timestamp: Date.now() 
      }));

      await redisPublisher.publish(`room-events:${roomCode}`, JSON.stringify({ 
        action: "SCORE_UPDATE", payload: leaderboard 
      }));

      return NextResponse.json({ success: true });
    }

    if (action === "USER_LEFT") {
      const existingStr = await redis.hget(roomKey, 'participants');
      let participants: string[] = existingStr ? JSON.parse(existingStr) : [];

      // 1. Remove the user from the official array
      participants = participants.filter(email => email !== payload.email);
      await redis.hset(roomKey, 'participants', JSON.stringify(participants));

      // 2. Save the exit to the permanent log history
      await redis.lpush(logsKey, `🔴 ${payload.name} left the room`);
      await redis.ltrim(logsKey, 0, 49);

      // 3. Broadcast to everyone else that they left
      await redisPublisher.publish(`room-events:${roomCode}`, JSON.stringify({ 
        action: "USER_LEFT", 
        payload: { email: payload.email, name: payload.name, allParticipants: participants } 
      }));

      return NextResponse.json({ success: true });
    }

    // Default handler
    const eventMessage = JSON.stringify({ action, payload, timestamp: Date.now() });
    await redisPublisher.publish(`room-events:${roomCode}`, eventMessage);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Action API Error:", error);
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
  }
}