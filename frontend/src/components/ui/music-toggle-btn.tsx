"use client";

import { motion } from "framer-motion";
import React, { useEffect, useState, useRef } from "react";

const Skiper25 = () => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div className="text-foreground absolute top-[20%] grid content-start justify-items-center gap-6 py-20 text-center">
        <span className="after:from-background after:to-foreground relative max-w-[12ch] text-xs uppercase leading-tight opacity-40 after:absolute after:left-1/2 after:top-full after:h-16 after:w-px after:bg-gradient-to-b after:content-['']">
          Click to play the music
        </span>
      </div>
      <MusicToggleButton />
    </div>
  );
};

export { Skiper25 };

export const MusicToggleButton = ({ onPlayChange, volume }: { onPlayChange?: (playing: boolean) => void; volume?: number }) => {
  const bars = 5;

  // Static initial value to prevent SSR/client hydration mismatch (React error #418)
  // Math.random() in useState causes different values server vs client
  const [heights, setHeights] = useState(() => Array(bars).fill(0.1) as number[]);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // We add a wrapper to call the prop
  const handlePlayState = (playing: boolean) => {
    setIsPlaying(playing);
    onPlayChange?.(playing);
  };

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        // Read env vars inside useEffect (client-only) — safe from hydration issues
        const streamUrl = process.env.NEXT_PUBLIC_STREAM_URL;
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

        if (streamUrl && streamUrl.trim() !== "") {
          // Dedicated Icecast stream tunnel (user-configured)
          audioRef.current.src = `${streamUrl}/stream?t=${Date.now()}`;
        } else {
          // Fallback: FastAPI /api/stream proxy (works with just one CF URL)
          audioRef.current.src = `${apiBase}/api/stream?t=${Date.now()}`;
        }
        audioRef.current.load();
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      }
    }
  }, [isPlaying]);


  useEffect(() => {
    if (isPlaying) {
      const waveformIntervalId = setInterval(() => {
        // Random heights only generated client side (inside useEffect) to avoid hydration mismatch
        setHeights(Array.from({ length: bars }, () => Math.random() * 0.8 + 0.2));
      }, 100);

      return () => {
        clearInterval(waveformIntervalId);
      };
    }
    setHeights(Array(bars).fill(0.1));
  }, [isPlaying]);

  // Apply volume prop to the audio element whenever it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, (volume ?? 50) / 100));
    }
  }, [volume]);

  // Global Remote Control for Interactive Call Interrupts
  useEffect(() => {
    const handleSync = () => {
      if (audioRef.current && isPlaying) {
        // Fast-forward cache explicitly to hear AI without the 5s Icecast queue delay
        const streamUrl = process.env.NEXT_PUBLIC_STREAM_URL;
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

        if (streamUrl && streamUrl.trim() !== "") {
          // Dedicated Icecast stream tunnel (user-configured)
          audioRef.current.src = `${streamUrl}/stream?t=${Date.now()}`;
        } else {
          // Fallback: FastAPI /api/stream proxy (works with just one CF URL)
          audioRef.current.src = `${apiBase}/api/stream?t=${Date.now()}`;
        }
        audioRef.current.load();
        audioRef.current.play().catch(() => {});
      }
    };
    
    const handleMute = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (audioRef.current) {
        if (customEvent.detail === true) {
          // Complete cut-off of the Icecast stream during a live call.
          // We rely exclusively on the WebSocket for sub-second conversational audio.
          audioRef.current.pause();
          audioRef.current.removeAttribute("src");
          audioRef.current.load();
        } else {
          // Call ended, resume the main broadcast
          audioRef.current.volume = Math.max(0, Math.min(1, (volume ?? 50) / 100));
          if (isPlaying) {
            const streamUrl = process.env.NEXT_PUBLIC_STREAM_URL;
            const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
            audioRef.current.src = (streamUrl && streamUrl.trim() !== "") ? `${streamUrl}/stream?t=${Date.now()}` : `${apiBase}/api/stream?t=${Date.now()}`;
            audioRef.current.load();
            audioRef.current.play().catch(() => {});
          }
        }
      }
    };

    window.addEventListener('radio-force-sync', handleSync);
    window.addEventListener('radio-mute-state', handleMute);
    return () => {
      window.removeEventListener('radio-force-sync', handleSync);
      window.removeEventListener('radio-mute-state', handleMute);
    };
  }, [isPlaying, volume]);

  const handleClick = () => {
    if (isPlaying) {
      handlePlayState(false);
    } else {
      handlePlayState(true);
    }
  };

  return (
    <>
      <motion.div
        onClick={handleClick}
        key="audio"
        initial={{ padding: "14px 14px " }}
        whileHover={{ padding: "18px 22px " }}
        whileTap={{ padding: "18px 22px " }}
        transition={{ duration: 1, bounce: 0.6, type: "spring" }}
        className="bg-background cursor-pointer rounded-full p-2"
      >
        <motion.div
          initial={{ opacity: 0, filter: "blur(4px)" }}
          animate={{
            opacity: 1,
            filter: "blur(0px)",
          }}
          exit={{ opacity: 0, filter: "blur(4px)" }}
          transition={{ type: "spring", bounce: 0.35 }}
          className="flex h-[18px] w-full items-center gap-1 rounded-full"
        >
          {/* Waveform visualization */}
          {heights.map((height, index) => (
            <motion.div
              key={index}
              className="bg-foreground w-[1px] rounded-full"
              initial={{ height: 1 }}
              animate={{
                height: Math.max(4, height * 14),
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 10,
              }}
            />
          ))}
        </motion.div>
      </motion.div>
      <audio ref={audioRef} preload="none" />
    </>
  );
};

