"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

interface Movie {
  title: string;
  poster_url: string | null;
  overview: string;
  rating: string | null;
  release_date: string;
}

export default function SwipeCards({ 
  movies, 
  roomCode, 
  userEmail,
  userName,
  initialIndex=0
}: { 
  movies: Movie[]; 
  roomCode: string; 
  userEmail: string | undefined;
  userName:string
  initialIndex?:number
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handleSwipe = async (direction: "LEFT" | "RIGHT") => {
    const currentMovie = movies[currentIndex];
    
    // 1. Send the swipe to the server so everyone else can see it in the activity log
    await fetch(`/api/room/${roomCode}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        action: "SWIPE", 
        payload: { email: userEmail, userName:userName, movieTitle: currentMovie.title, direction} 
      }),
    });

    // 2. Move to the next card locally
    setCurrentIndex((prev) => prev + 1);
  };

  if (currentIndex >= movies.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl text-center space-y-4">
        <h3 className="text-2xl font-bold text-white">Out of Movies!</h3>
        <p className="text-zinc-400">Waiting for the group to finish swiping so the AI can declare a match...</p>
      </div>
    );
  }

  const movie = movies[currentIndex];

  return (
    <>
      <div className="w-full max-w-sm mx-auto bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col relative group">
      
      {/* Movie Poster with Cinematic Fade */}
      <div className="h-[420px] relative shrink-0">
        {movie.poster_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={movie.poster_url} 
            alt={movie.title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 border-b border-white/5">
            <span className="text-zinc-600 font-bold tracking-widest uppercase text-sm">No Poster</span>
          </div>
        )}
        
        {/* Gradient Overlay (blends the image into the dark card) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent pointer-events-none"></div>
        
        {/* Glassmorphic Rating Badge */}
        {movie.rating && (
          <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-yellow-500 font-black px-3 py-1.5 rounded-full text-sm border border-white/10 shadow-xl flex items-center gap-1">
            ★ <span className="text-white">{movie.rating}</span>
          </div>
        )}
      </div>

      {/* Movie Info (Pulled up slightly to overlap the gradient) */}
      <div className="p-6 pt-0 grow flex flex-col justify-between relative z-10 -mt-12">
        <div className="space-y-2">
          <h3 className="text-3xl font-black text-white leading-tight tracking-tight drop-shadow-lg">
            {movie.title}
          </h3>
          <p className="text-indigo-400 text-xs font-bold tracking-widest uppercase drop-shadow-md">
            {movie.release_date}
          </p>
          <p className="text-zinc-300 text-sm mt-4 line-clamp-3 leading-relaxed">
            {movie.overview}
          </p>
        </div>

        {/* Swipe Controls */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
          
          {/* Left Swipe Button */}
          <button 
            onClick={() => handleSwipe("LEFT")}
            className="group/btn relative flex items-center justify-center p-4 bg-white/5 border border-white/10 text-red-400 rounded-full hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300 transition-all duration-300 active:scale-90 shadow-lg"
          >
            <X size={28} className="group-hover/btn:-rotate-12 transition-transform duration-300" />
          </button>
          
          {/* Progress Indicator */}
          <span className="text-zinc-500 font-mono text-xs font-bold tracking-[0.2em] uppercase">
            {currentIndex + 1} / {movies.length}
          </span>

          {/* Right Swipe Button */}
          <button 
            onClick={() => handleSwipe("RIGHT")}
            className="group/btn relative flex items-center justify-center p-4 bg-white/5 border border-white/10 text-green-400 rounded-full hover:bg-green-500/20 hover:border-green-500/50 hover:text-green-300 transition-all duration-300 active:scale-90 shadow-lg"
          >
            <Check size={28} className="group-hover/btn:rotate-12 transition-transform duration-300" />
          </button>
          
        </div>
      </div>
    </div>
    </>
  );
}