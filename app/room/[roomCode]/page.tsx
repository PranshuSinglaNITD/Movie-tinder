"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, use } from "react";
import VibeInput from "@/components/VibeInput";
import SwipeCards from "@/components/SwipeCards";
import { join } from "path";
import { LogOut, Trophy, User } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";

export default function RoomDashboard({ params }: { params: Promise<{ roomCode: string }> }) {
  const { data: session } = useSession();
  const { roomCode } = use(params)

  const [participants, setParticipants] = useState<string[]>([]);
  const [liveActions, setLiveActions] = useState<string[]>([]);
  const [guestPrompt, setGuestPrompt] = useState("");
  const [moviePool, setMoviePool] = useState<any[]>([]);
  const [resumedIndex,setResumedIndex]=useState(0)
  const router=useRouter()
  // NEW: State to hold the AI's room analysis
  const [roomContext, setRoomContext] = useState<{ headcount: number; vibe: string } | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const hasAnnouncedRef = useRef(false);
  
  const currentUserName = session?.user?.name || session?.user?.email?.split('@')[0] || "User";
  
  const submitGuestPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestPrompt.trim()) return;

    await fetch(`/api/room/${roomCode}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: guestPrompt,
        userEmail: session?.user?.email,
        userName: currentUserName
      }),
    });

    setGuestPrompt(""); 
  };

  // NEW: The Beacon Leave Detector
  useEffect(() => {
    if (!session?.user?.email) return;

    const handleDisconnect = () => {
      const payload = {
        action: "USER_LEFT",
        payload: { 
          email: session?.user?.email, 
          name: currentUserName 
        }
      };
      
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(`/api/room/${roomCode}/action`, blob);
    };

    window.addEventListener("beforeunload", handleDisconnect);
    
    return () => {
      window.removeEventListener("beforeunload", handleDisconnect);
    };
  }, [roomCode, session, currentUserName]);

  const handleLeaveRoom = async () => {
    // 1. Tell the server we are leaving
    await fetch(`/api/room/${roomCode}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "USER_LEFT",
        payload: { 
          email: session?.user?.email, 
          name: currentUserName 
        }
      }),
    });

    // 2. Route the user back to the home/join screen
    router.push("/");
  };

  useEffect(() => {
    const recoverRoomState = async () => {
      // Don't fetch until we know who the user is
      if (!session?.user?.email) return; 

      // Send the email in the URL so the server can look up their specific progress
      const res = await fetch(`/api/room/${roomCode}/state?email=${encodeURIComponent(session.user.email)}`);
      const data = await res.json();
      
      if (data.success) {
        if (data.moviePool?.length > 0) setMoviePool(data.moviePool);
        if (data.roomContext) setRoomContext(data.roomContext);
        
        // Recover the logs and the swipe progress!
        if (data.logs?.length > 0) setLiveActions(data.logs);
        if (data.currentIndex !== undefined) setResumedIndex(data.currentIndex);
      }
    };
    recoverRoomState();
  }, [roomCode, session]);

  // 1. The Announcer Effect with the Gatekeeper Lock
  useEffect(() => {
    const joinRoom = async () => {
      const res = await fetch(`/api/room/${roomCode}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "USER_JOINED",
          payload: { 
            email: session!.user!.email, 
            name: session!.user!.name || session!.user!.email!.split('@')[0] 
          }
        }),
      });
      const data = await res.json();
      if (data.allParticipants) {
        setParticipants(data.allParticipants);
      }
    };

    if (session?.user?.email && !hasAnnouncedRef.current) {
      hasAnnouncedRef.current = true; 
      setParticipants((prev) => [...new Set([...prev, session.user?.email as string])]);
      joinRoom();
    }
  }, [roomCode, session]);

  // 2. The SSE Listener
  useEffect(() => {
    if (!session?.user) return;

    if (!eventSourceRef.current) {
      eventSourceRef.current = new EventSource(`/api/room/${roomCode}/stream`);

      eventSourceRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.action === "USER_JOINED") {
          setParticipants(data.payload.allParticipants);
          if (session.user?.email !== data.payload.email)
            setLiveActions((prev) => [`🟢 ${data.payload.name} joined the room`, ...prev]);
        }

        if (data.action === "PROMPT_ADDED") {
          // FIXED: Use the sender's name from the payload, not the local user's name
          setLiveActions((prev) => [`💬 ${data.payload.userName || data.payload.email} wants: "${data.payload.prompt}"`, ...prev]);
        }

        if (data.action === "USER_LEFT") {
          setParticipants(data.payload.allParticipants);
          if (session.user?.email !== data.payload.email)
          setLiveActions((prev) => [`🔴 ${data.payload.name} left the room`, ...prev]);
        }

        if (data.action === "SWIPE") {
          const swipeIcon = data.payload.direction === "RIGHT" ? "👍" : "👎";
          setLiveActions((prev) => [
            `${swipeIcon} ${data.payload.userName} swiped ${data.payload.direction} on ${data.payload.movieTitle}`,
            ...prev
          ]);
        }

        if (data.action === "MOVIES_READY") {
          // UPDATED: Catch the movies AND the context from the new backend payload
          setMoviePool(data.payload.movies);
          setRoomContext({ headcount: data.payload.headcount, vibe: data.payload.vibe });
          setLiveActions((prev) => ["👨‍💻AI generated the movie pool! Start swiping.", ...prev]);
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

  useEffect(() => {
    const recoverRoomState = async () => {
      if (!session?.user?.email) return; 

      const res = await fetch(`/api/room/${roomCode}/state?email=${encodeURIComponent(session.user.email)}`);
      const data = await res.json();
      
      if (data.success) {
        if (data.moviePool?.length > 0) setMoviePool(data.moviePool);
        if (data.roomContext) setRoomContext(data.roomContext);
        
        // NEW: Recover the participants list!
        if (data.participants?.length > 0) setParticipants(data.participants);
        
        if (data.logs?.length > 0) setLiveActions(data.logs);
        if (data.currentIndex !== undefined) setResumedIndex(data.currentIndex);
      }
    };
    recoverRoomState();
  }, [roomCode, session]);


  return (
    <>
    <Navbar/>
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black text-white p-4 md:p-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-4xl mx-auto space-y-10">
        
        <header className="flex justify-between items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-1">Session</span>
            <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
              {roomCode}
            </h2>
          </div>
          <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-full border border-white/5 shadow-inner">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm font-semibold text-zinc-300">{participants.length} Active</span>
          </div>
          <button
              onClick={handleLeaveRoom}
              className="group flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 sm:px-4 py-2 rounded-full font-semibold transition-all active:scale-95 text-xs sm:text-sm"
              title="Leave Room"
            >
              <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span className="hidden sm:inline">Leave Room</span>
            </button>
        </header>

        {/* PROMPT FORM: Ambient Glow */}
        {moviePool.length === 0 && (
          <div className="relative group max-w-2xl mx-auto">
            <div className="absolute -inset-1 bg-linear-to-r from-indigo-500 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <form onSubmit={submitGuestPrompt} className="relative flex gap-2 bg-zinc-950 p-2 rounded-xl border border-white/10 shadow-2xl">
              <input 
                type="text" 
                value={guestPrompt}
                onChange={(e) => setGuestPrompt(e.target.value)}
                placeholder="Throw a movie idea into the group pool..." 
                className="flex-grow bg-transparent px-4 py-3 text-white placeholder-zinc-600 focus:outline-none"
              />
              <button 
                type="submit"
                className="bg-gradient-to-r from-indigo-600 to-cyan-600 px-8 rounded-lg font-bold hover:brightness-110 transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]"
              >
                Send
              </button>
            </form>
          </div>
        )}
        
        {/* MAIN MATCHING AREA */}
        {moviePool.length > 0 ? (
          <div className="animate-in slide-in-from-bottom-8 fade-in duration-700 flex flex-col items-center">
            
            <div className="flex items-center justify-between w-full max-w-sm mb-8">
              <h3 className="text-2xl font-black tracking-tight text-white">Match Time</h3>
              <Link 
                href={`/room/${roomCode}/results`}
                className="group flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-full font-semibold transition-all backdrop-blur-md"
              >
                <Trophy size={16} className="text-yellow-500 group-hover:scale-110 transition-transform" />
                Live Results
              </Link>
            </div>
            
            {/* AI ANALYSIS: Cyberpunk Terminal Vibe */}
            {roomContext && (
              <div className="w-full max-w-sm mb-8 bg-black/40 border border-indigo-500/20 p-5 rounded-2xl text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>
                <p className="text-indigo-400 font-bold mb-3 text-xs uppercase tracking-[0.2em]">AI Vision Analysis</p>
                <div className="flex items-center justify-center gap-2 text-zinc-100 font-medium mb-3 bg-white/5 w-max mx-auto px-4 py-1.5 rounded-full border border-white/5">
                  <User size={16} className="text-indigo-400" />
                  <span>{roomContext.headcount} detected</span>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed px-4">
                  "{roomContext.vibe}"
                </p>
              </div>
            )}

            <div className="relative z-10 w-full">
              <SwipeCards
                movies={moviePool}
                roomCode={roomCode}
                userEmail={session?.user?.email ?? undefined}
                userName={currentUserName} 
                initialIndex={resumedIndex}
              />
            </div>
          </div>
        ) : (
          <div className="pt-8">
            <VibeInput roomCode={roomCode} />
          </div>
        )}

        {/* ACTIVITY LOG: Stealth UI */}
        <div className="max-w-2xl mx-auto mt-12">
          <div className="p-5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-2xl">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-zinc-500"></div>
              Live Server Log
            </h3>

            <div className="h-40 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {liveActions.length > 0 ? (
                liveActions.map((action, index) => (
                  <div
                    key={index}
                    className={`animate-in slide-in-from-left-4 fade-in duration-300 flex items-start gap-3 ${index === 0 ? 'opacity-100' : 'opacity-60'}`}
                  >
                    <span className="text-zinc-700 text-xs mt-1 font-mono">
                      {new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                    </span>
                    <p className={`text-sm ${index === 0 ? 'text-white font-medium' : 'text-zinc-400'}`}>
                      {action}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-zinc-600 text-sm italic font-mono">Awaiting system events...</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
    </>
    
  );
  
}