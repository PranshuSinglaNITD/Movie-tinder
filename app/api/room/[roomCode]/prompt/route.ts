import { NextRequest, NextResponse } from 'next/server';
import { redis, redisPublisher } from '@/middleware/redis';

export async function POST(req: NextRequest, { params }: { params: Promise<{ roomCode: string }> }) {
  try {
    const { roomCode } = await params;
    const { prompt, userEmail } = await req.json();
    
    // Create a dedicated atomic queue for this room's prompts
    const promptsKey = `room-prompts:${roomCode}`;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // 1. RPUSH safely adds this to the end of the list in Redis
    await redis.rpush(promptsKey, `${userEmail} requested: ${prompt}`);

    // 2. Notify the frontend so it appears in the Live Activity Log
    await redisPublisher.publish(`room-events:${roomCode}`, JSON.stringify({
      action: "PROMPT_ADDED",
      payload: { email: userEmail, prompt }
    }));

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Prompt API Error:", error);
    return NextResponse.json({ error: "Failed to save prompt" }, { status: 500 });
  }
}