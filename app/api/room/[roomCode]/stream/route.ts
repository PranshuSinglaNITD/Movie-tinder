import { NextRequest } from 'next/server';
import { redisSubscriber } from '@/middleware/redis';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = await params;
  
  const stream = new ReadableStream({
    async start(controller) {
      const channel = `room-events:${roomCode}`;
      let isStreamClosed = false; // Track the state locally
      
      await redisSubscriber.subscribe(channel);

      // Define a named handler so we can safely remove it later
      const messageHandler = (ch: string, message: string) => {
        if (ch === channel && !isStreamClosed) {
          try {
            controller.enqueue(`data: ${message}\n\n`);
          } catch (err) {
            console.error("Failed to enqueue message, stream might be closing:", err);
          }
        }
      };

      // Attach the listener
      redisSubscriber.on('message', messageHandler);

      // Cleanup when the user closes the tab or leaves the room
      req.signal.addEventListener('abort', () => {
        isStreamClosed = true; // Mark as closed immediately to block new messages
        
        // Remove this specific user's listener from Redis
        redisSubscriber.off('message', messageHandler); 
        redisSubscriber.unsubscribe(channel);
        
        try {
          controller.close();
        } catch (e) {
          // Ignore errors if it was already closed by the browser
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}