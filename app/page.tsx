"use client";

import { signIn, useSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Film, ArrowRight, Sparkles, LogIn } from "lucide-react";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");

  const createRoom = async () => {
    const res = await fetch("/api/room", { method: "POST" });
    const data = await res.json();
    if (data.roomCode) {
      router.push(`/room/${data.roomCode}`);
    }
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      router.push(`/room/${joinCode.toUpperCase()}`);
    }
  };

  return (
    <>
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black text-white p-4 sm:p-8 overflow-hidden selection:bg-indigo-500/30">
      
      {/* Decorative Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[128px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[128px] pointer-events-none"></div>

      {/* Main Glassmorphic Card */}
      <div className="relative z-10 w-full max-w-md p-8 sm:p-10 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl space-y-10 animate-in fade-in zoom-in-95 duration-700">
        
        {/* Header Section */}
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl mb-2 border border-indigo-500/20 shadow-[0_0_15px_rgba(79,70,229,0.2)]">
            <Film className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-400">
            MovieMatch
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base font-medium">
            The AI-powered group movie decision engine.
          </p>
        </div>

        {/* Auth / Action Section */}
        {!session ? (
          <div className="pt-4">
            <button 
              onClick={() => signIn("google")}
              className="cursor-pointer group relative flex w-full items-center justify-center gap-3 bg-white text-black px-4 py-3.5 rounded-xl font-bold hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-lg"
            >
              {/* Simple Google G SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />

              </svg>
              Continue with Google
            </button>
          </div>
        ) : (
          <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-zinc-400">Welcome back,</p>
              <p className="text-lg font-bold text-white">{session.user?.name}</p>
            </div>
            
            <button 
              onClick={createRoom}
              className="cursor-pointer group relative w-full flex justify-center items-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white py-3.5 rounded-xl font-bold shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] hover:brightness-110 transition-all active:scale-[0.98]"
            >
              <Sparkles size={18} className="text-indigo-200" />
              Create New Room
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="relative flex items-center py-2">
              <div className="grow border-t border-white/10"></div>
              <span className="shrink-0 mx-4 text-zinc-500 text-xs font-bold uppercase tracking-widest">or join existing</span>
              <div className="grow border-t border-white/10"></div>
            </div>

            <form onSubmit={joinRoom} className="flex gap-2">
              <input 
                type="text" 
                placeholder="ROOM CODE" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="grow bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono font-bold tracking-widest focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-zinc-600 uppercase transition-all"
                maxLength={6}
              />
              <button 
                type="submit"
                className="group flex items-center justify-center gap-2 bg-white/10 border border-white/10 px-6 rounded-xl font-bold hover:bg-white/20 transition-all active:scale-[0.95]"
              >
                Join
                <LogIn size={18} className="text-zinc-400 group-hover:text-white transition-colors" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Footer / Version branding */}
      <div className="absolute bottom-6 text-zinc-600 text-xs font-mono font-medium tracking-widest">
        MOVIEMATCH V1.0.0
      </div>
    </main>
    </>
  );
}