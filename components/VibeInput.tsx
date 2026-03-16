"use client";

import { useState, useRef, useEffect } from "react";
import {Loader2,Sparkles,Scan,CheckCircle2,Camera} from "lucide-react"

export default function VibeInput({ roomCode }: { roomCode: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [prompt, setPrompt] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Start the webcam
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check your permissions.");
    }
  };

  // Stop the webcam
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      setIsCameraActive(false);
    }
  };

  // Capture frame and send to Next.js API
  const analyzeRoom = async () => {
    if (!prompt.trim()) return alert("Please enter a movie prompt first!");
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);

    // Draw the current video frame onto the canvas
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    // Convert the canvas to a Base64 string
    const imageBase64 = canvas.toDataURL("image/jpeg");

    try {
      // Send to our Next.js API Route
      const res = await fetch(`/api/room/${roomCode}/vision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, prompt }),
      });

      const data = await res.json();
      if (data.success) {
        setResult(data.data); // data.data contains { headcount, vibe, recommendations }
        stopCamera();
      } else {
        alert("Failed to analyze room.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Cleanup camera when component unmounts
  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <>
      <div className="w-full max-w-2xl mx-auto bg-black/40 backdrop-blur-2xl border border-white/10 p-6 sm:p-8 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] space-y-8 relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
      
      {/* Decorative Top Glow */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-30"></div>

      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
          <Camera className="w-6 h-6 text-indigo-400" />
        </div>
        <h3 className="text-2xl sm:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tight">
          Host: Set the Vibe
        </h3>
      </div>

      {/* Text Prompt Input */}
      <div className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">
          What are we feeling?
        </label>
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          <textarea
            className="relative w-full bg-black/60 border border-white/10 rounded-xl p-4 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner resize-none custom-scrollbar"
            rows={3}
            placeholder="e.g., A mind-bending sci-fi thriller with huge plot twists..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
      </div>

      {/* Webcam Viewfinder */}
      <div className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">
          Room Analysis Scanner
        </label>
        <div className="relative bg-black/80 rounded-2xl overflow-hidden aspect-video flex flex-col items-center justify-center border border-white/10 shadow-inner group">
          
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-700 ${!isCameraActive ? "opacity-0 absolute" : "opacity-100 relative"}`}
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Subtle scanning grid overlay when camera is active */}
          {isCameraActive && (
             <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
          )}

          {!isCameraActive && !result && (
            <div className="flex flex-col items-center gap-4 p-6 z-10">
              <Scan className="w-12 h-12 text-zinc-600 group-hover:text-indigo-400 transition-colors duration-500" />
              <button
                onClick={startCamera}
                className="group/btn relative overflow-hidden px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold rounded-xl transition-all active:scale-95 flex items-center gap-2"
              >
                <span className="relative z-10">Enable Camera</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {isCameraActive && !result && (
        <button
          onClick={analyzeRoom}
          disabled={isProcessing}
          className={`relative w-full py-4 rounded-xl font-black text-lg transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-3 overflow-hidden ${
            isProcessing 
              ? "bg-indigo-900/50 text-indigo-200 border border-indigo-500/30 cursor-not-allowed" 
              : "bg-gradient-to-r from-indigo-600 to-cyan-600 text-white hover:brightness-110 shadow-[0_0_20px_rgba(79,70,229,0.4)]"
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing Vibe & Counting People...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Snap & Generate Recommendations</span>
            </>
          )}
        </button>
      )}

      {/* Results Display: Cyberpunk Terminal */}
      {result && (
        <div className="bg-black/60 p-5 rounded-xl border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.1)] space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-500 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500/50"></div>
          
          <div className="flex items-center gap-2 text-green-400 font-mono text-sm font-bold uppercase tracking-widest">
            <CheckCircle2 className="w-4 h-4" />
            <span>Analysis Complete</span>
          </div>
          
          <div className="space-y-2 pl-2">
            <p className="text-zinc-300 text-sm">
              <span className="text-zinc-500 font-mono uppercase mr-2">Headcount:</span> 
              <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded text-xs">{result.headcount} DETECTED</span>
            </p>
            <p className="text-zinc-300 text-sm leading-relaxed">
              <span className="text-zinc-500 font-mono uppercase mr-2 block mb-1">Room Vibe:</span> 
              <span className="italic text-zinc-300">"{result.vibe}"</span>
            </p>
          </div>
          
          <div className="pt-3 mt-3 border-t border-white/5 flex items-center gap-3">
             <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
             <p className="text-indigo-400 font-semibold text-sm">Generating movie pool for the room...</p>
          </div>
        </div>
      )}
    </div>
    </>
  );
}