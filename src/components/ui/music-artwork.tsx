"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useAnimationFrame } from 'framer-motion';

interface MusicArtworkProps {
  artist: string;
  music: string;
  albumArt: string;
  isSong: boolean;
  isLoading?: boolean;
  autoLoop?: boolean;
}

export default function MusicArtwork({
  artist,
  music,
  albumArt,
  isSong,
  isLoading = false,
  autoLoop = false
}: MusicArtworkProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Custom manual rotation tracking for buttery smooth stops/starts
  const vinylRef = useRef<HTMLDivElement>(null);
  const rotationDegrees = useRef(0);

  // Calculate spin duration based on type: songs (0.75 rev/sec) vs albums (0.55 rev/sec)
  const spinSpeed = isSong ? 0.75 : 0.55; // revolutions per second

  // Drive the rotation manually using useAnimationFrame to allow seamless pausing without snapping
  useAnimationFrame((time, delta) => {
    if (isPlaying) {
      const degreesPerSecond = spinSpeed * 360;
      rotationDegrees.current += degreesPerSecond * (delta / 1000);
      if (vinylRef.current) {
        vinylRef.current.style.transform = `rotate(${rotationDegrees.current}deg)`;
      }
    }
  });

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (!autoLoop) return;

    let step = 0;
    const interval = setInterval(() => {
      // 0: Hover on (slide out vinyl)
      // 1: Play (spin)
      // 2: Pause (stop spin)
      // 3: Hover off (slide in vinyl)
      if (step === 0) {
        setIsHovered(true);
      } else if (step === 1) {
        setIsPlaying(true);
      } else if (step === 2) {
        setIsPlaying(false);
      } else if (step === 3) {
        setIsHovered(false);
      }
      step = (step + 1) % 4;
    }, 3000); // changes every 3 seconds for smoother, longer readability

    return () => clearInterval(interval);
  }, [autoLoop]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      requestAnimationFrame(() => {
        const tooltipWidth = 300;
        const tooltipHeight = 60;
        const offset = 20;

        let x = e.clientX + offset;
        let y = e.clientY - tooltipHeight - 10;

        if (x + tooltipWidth > window.innerWidth) x = e.clientX - tooltipWidth - offset;
        if (y < 0) y = e.clientY + offset;
        if (y + tooltipHeight > window.innerHeight) y = e.clientY - tooltipHeight - offset;

        setMousePosition({ x, y });
      });
    };

    if (isHovered && !autoLoop) { // Disable mouse tooltip during autoLoop to prevent visual bugs
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isHovered, autoLoop]);

  if (isLoading) {
    return (
      <div className="relative">
        <div className="relative group">
          <div className="w-48 h-48 sm:w-64 sm:h-64 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Enhanced Tooltip that follows cursor - Desktop only, utilizing framer-motion for smooth entrance */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed z-50 pointer-events-none hidden sm:block"
            style={{
              left: mousePosition.x,
              top: mousePosition.y,
              transform: 'translateZ(0)',
            }}
          >
            <div className="bg-neutral-900/90 backdrop-blur-md text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap shadow-lg border border-neutral-700/50">
              <span className="font-bold">{artist}</span> &nbsp;•&nbsp; {music}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main container */}
      <div className="relative group">
        {/* Vinyl record with smooth framer-motion sliding */}
        <motion.div
          animate={{
            x: isHovered ? 0 : (window.innerWidth < 640 ? 48 : 96),
            opacity: isHovered ? 1 : 0
          }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="absolute -left-16 sm:-left-24 top-1/2 -translate-y-1/2"
        >
          <div className="relative w-50 h-50 sm:w-70 sm:h-70">
            <div
              ref={vinylRef}
              className="w-full h-full"
            >
              <Image
                src="https://pngimg.com/d/vinyl_PNG95.png"
                alt="Vinyl Record"
                width={80}
                height={80}
                className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(255,107,53,0.3)]"
                unoptimized
              />
            </div>
          </div>
        </motion.div>

        {/* Album artwork */}
        <div
          className="relative overflow-hidden rounded-lg shadow-2xl w-48 h-48 sm:w-64 sm:h-64 pointer-events-none"
        >
          <Image
            src={albumArt}
            alt={`${music} Cover`}
            width={256}
            height={256}
            className={`w-full h-full object-cover transition-all duration-300 ease-out group-hover:scale-110 ${!imageLoaded ? 'opacity-0' : 'opacity-100'
              }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)}
            unoptimized
          />

          {!imageLoaded && (
            <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
          )}

          {/* Play/Pause button with text on mobile */}
          <div className={`absolute bottom-2 left-2 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'
            }`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-transparent rounded-full flex items-center justify-center shadow-lg">
                {isPlaying ? (
                  <div className="flex gap-0.5">
                    <div className="w-0.5 h-3 bg-white rounded"></div>
                    <div className="w-0.5 h-3 bg-white rounded"></div>
                  </div>
                ) : (
                  <div className="w-0 h-0 border-l-[6px] border-l-white border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent ml-0.5"></div>
                )}
              </div>
              <div className="sm:hidden">
                <div className="text-white text-[10px] font-medium whitespace-nowrap bg-black/40 backdrop-blur-sm px-2 py-1 rounded">
                  <span className="font-bold">{artist}</span> • {music}
                </div>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </div>
    </div>
  );
}