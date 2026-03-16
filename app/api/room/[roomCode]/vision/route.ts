import { NextRequest, NextResponse } from 'next/server';
import { redis, redisPublisher } from '@/middleware/redis';

export async function POST(req: NextRequest, { params }: { params: Promise<{ roomCode: string }> }) {
  try {
    const { imageBase64, prompt: hostPrompt } = await req.json();
    const { roomCode } = await params;

    // 1. Validate FIRST before manipulating data
    if (!imageBase64 || !hostPrompt) {
      return NextResponse.json({ error: "Both image and prompt are required" }, { status: 400 });
    }

    const promptsKey = `room-prompts:${roomCode}`;
    const guestPrompts = await redis.lrange(promptsKey, 0, -1); 
    
    // Combine the Host's prompt with everyone else's ideas
    const combinedPrompts = [
      `Host wants: ${hostPrompt}`,
      ...guestPrompts 
    ].join(" | ");

    console.log("Step 1: Forwarding combined prompts to Python...");

    // Forward the payload to your FastAPI Python Microservice
    const pythonResponse = await fetch("http://localhost:8000/process-vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, prompt: combinedPrompts })
    });

    if (!pythonResponse.ok) {
      throw new Error(`Python microservice failed with status: ${pythonResponse.status}`);
    }

    const pythonData = await pythonResponse.json();
    
    console.log("Step 2: Python Data Received. Cleaning JSON...");
    
    // Defensive parsing: Strip out markdown formatting if Gemini included it
    let cleanJsonStr = pythonData.result;
    if (typeof cleanJsonStr === 'string') {
      cleanJsonStr = cleanJsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    const analysisResult = JSON.parse(cleanJsonStr);

    console.log("Step 3: Fetching OMDb posters...");
    const enrichRes = await fetch(`${req.nextUrl.origin}/api/movies/enrich`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movies: analysisResult.recommendations.map((m: any) => m.title || m) })
    });
    
    const enrichData = await enrichRes.json();
    const finalMoviePool = enrichData.success ? enrichData.enrichedMovies : analysisResult.recommendations;

    console.log("Step 4: Saving to Redis and Broadcasting...");
    
    const roomKey = `room:${roomCode}`;
    
    // BUG FIX: Save 'finalMoviePool' to Redis, not the raw AI recommendations!
    await redis.hset(roomKey, 'moviePool', JSON.stringify(finalMoviePool));
    await redis.hset(roomKey, 'roomVibe', JSON.stringify({ headcount: analysisResult.headcount, vibe: analysisResult.vibe }));

    await redisPublisher.publish(`room-events:${roomCode}`, JSON.stringify({
      action: "MOVIES_READY",
      payload: {
        movies:finalMoviePool,
        headCount: analysisResult.headCount,
        vibe: analysisResult.vibe
      }
    }));

    return NextResponse.json({ 
      success: true, 
      data: { 
        headcount: analysisResult.headcount, 
        vibe: analysisResult.vibe, 
        recommendations: finalMoviePool 
      } 
    });

  } catch (error) {
    // This will print the EXACT reason it failed in your Next.js terminal
    console.error("Vision API Error Details:", error);
    return NextResponse.json({ error: "Failed to process image", details: String(error) }, { status: 500 });
  }
}