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

  const getRandomHeights = () => {
    return Array.from({ length: bars }, () => Math.random() * 0.8 + 0.2);
  };

  const [heights, setHeights] = useState(getRandomHeights());
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
        // Stream URL priority:
        // 1. NEXT_PUBLIC_STREAM_URL — explicit separate stream tunnel (optional)
        // 2. NEXT_PUBLIC_API_URL/api/stream — uses the existing FastAPI proxy (recommended: one tunnel for both)
        // 3. localhost:8000 — local dev only (will fail on mobile from HTTPS)
        const apiBase = process.env.NEXT_PUBLIC_API_URL;
        const streamBase =
          process.env.NEXT_PUBLIC_STREAM_URL ||
          (apiBase ? `${apiBase}/api/stream` : null);

        if (!streamBase) {
          // Local dev fallback
          audioRef.current.src = `http://localhost:8000/stream?t=${Date.now()}`;
        } else if (streamBase.includes("/api/stream")) {
          // API proxy — no extra path suffix needed
          audioRef.current.src = `${streamBase}?t=${Date.now()}`;
        } else {
          // Dedicated stream tunnel pointing at Icecast
          audioRef.current.src = `${streamBase}/stream?t=${Date.now()}`;
        }
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      const waveformIntervalId = setInterval(() => {
        setHeights(getRandomHeights());
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

