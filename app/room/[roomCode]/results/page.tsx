"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, use } from "react";
import { Trophy, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ResultsPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { data: session } = useSession();
  const { roomCode } = use(params);
  
  const [leaderboard, setLeaderboard] = useState<{title: string, score: number}[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  // 1. Fetch initial scores on page load
  useEffect(() => {
    const fetchInitialScores = async () => {
      const res = await fetch(`/api/room/${roomCode}/results`);
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.leaderboard);
      }
    };
    fetchInitialScores();
  }, [roomCode]);

  // 2. Listen to the live SSE stream for real-time updates
  useEffect(() => {
    if (!session?.user) return;

    if (!eventSourceRef.current) {
      eventSourceRef.current = new EventSource(`/api/room/${roomCode}/stream`);

      eventSourceRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Catch the live score updates!
        if (data.action === "SCORE_UPDATE") {
          setLeaderboard(data.payload);
        }
      };
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [roomCode, session]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Navigation Header */}
        <header className="flex justify-between items-center border-b border-zinc-800 pb-4">
          <Link 
            href={`/room/${roomCode}`} 
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft size={20} /> Back to Room
          </Link>
          <h2 className="text-xl font-bold text-indigo-400">Room {roomCode}</h2>
        </header>

        {/* The Leaderboard */}
        <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl">
          <h3 className="text-3xl font-bold text-center mb-8 text-white flex items-center justify-center gap-3">
            <Trophy className="text-yellow-500" size={32} /> Live Rankings
          </h3>
          
          {leaderboard.length === 0 ? (
            <p className="text-center text-zinc-500 italic mt-10">Waiting for the first swipe...</p>
          ) : (
            <div className="space-y-4">
              {leaderboard.map((item, index) => (
                <div 
                  key={item.title} 
                  className={`flex items-center justify-between p-5 rounded-lg border transition-all duration-300 ${
                    index === 0 ? "bg-indigo-600/20 border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.2)]" : "bg-zinc-950 border-zinc-800"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`font-black text-2xl w-8 text-center ${index === 0 ? "text-yellow-500" : "text-zinc-500"}`}>
                      #{index + 1}
                    </span>
                    <span className={`font-bold text-lg ${index === 0 ? "text-white" : "text-zinc-300"}`}>
                      {item.title}
                    </span>
                  </div>
                  <div className={`px-4 py-2 rounded-full font-black text-lg ${index === 0 ? "bg-indigo-600 text-white" : "bg-zinc-800 text-green-400"}`}>
                    {item.score} Votes
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}