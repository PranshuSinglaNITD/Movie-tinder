"use client";

import { signOut } from "next-auth/react";
import { Film, LogOut } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="w-full bg-zinc-950 border-b border-zinc-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-2 text-indigo-400 font-bold text-xl tracking-wider">
        <img src={'/Movie.png'} alt="Movie_Tinder" className="h-10 w-auto object-contain mix-blend-screen brightness-200"/>
      </div>
      
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg text-zinc-400 hover:bg-red-600 transition-all duration-200 hover:text-white"
      >
        <span className="text-sm font-semibold">Sign Out</span>
        <LogOut size={18} />
      </button>
    </nav>
  );
}