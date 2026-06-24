"use client";

import React, { useState, useEffect, useCallback } from "react";
import MusicArtwork from "./music-artwork";
import { MusicToggleButton } from "./music-toggle-btn";
import { MinimalVolumeBar } from "./minimal-volume-bar";
import { MicroExpander } from "./micro-expander";
import { Heart, Share2, ListPlus, MessageCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export function LiveRadioPlayer({ isPlaying, setIsPlaying, language = 'en', onChatToggle }: { isPlaying: boolean, setIsPlaying: (val: boolean) => void, language?: string, onChatToggle?: () => void }) {
  const [nowPlaying, setNowPlaying] = useState({
    title: "Booting...",
    artist: "Tingo AI Radio",
    type: "show",
    coverUrl: "/LLAMA.png",
  });
  // Translated display values (may differ from raw API values)
  const [displayTitle, setDisplayTitle] = useState("Booting...");
  const [displayArtist, setDisplayArtist] = useState("Tingo AI Radio");
  const [isTranslating, setIsTranslating] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isMobile, setIsMobile] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // ── Translation helper (MyMemory free API — 5000 words/day, no key needed) ──
  const translateText = async (text: string, targetLang: string): Promise<string> => {
    if (!text || targetLang === 'en') return text;
    try {
      // Map our codes to MyMemory langpair format
      const langMap: Record<string, string> = {
        fr: 'fr', es: 'es', de: 'de', yo: 'yo', ha: 'ha',
        pt: 'pt', ar: 'ar', zh: 'zh-CN', hi: 'hi',
      };
      const target = langMap[targetLang] || targetLang;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${target}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        return data.responseData.translatedText;
      }
    } catch (e) {
      // silently fail — return original
    }
    return text;
  };

  useEffect(() => {
    setIsMobile(navigator.maxTouchPoints > 0 || window.innerWidth < 768);
  }, []);

  // ── Re-translate whenever language or nowPlaying changes ──
  useEffect(() => {
    if (language === 'en') {
      setDisplayTitle(nowPlaying.title);
      setDisplayArtist(nowPlaying.artist);
      return;
    }
    // Only translate show/ad names — songs keep their English titles (they sound better)
    if (nowPlaying.type === 'music') {
      setDisplayTitle(nowPlaying.title);
      setDisplayArtist(nowPlaying.artist);
      return;
    }
    let cancelled = false;
    setIsTranslating(true);
    Promise.all([
      translateText(nowPlaying.title, language),
      translateText(nowPlaying.artist, language),
    ]).then(([t, a]) => {
      if (!cancelled) {
        setDisplayTitle(t);
        setDisplayArtist(a);
      }
    }).finally(() => {
      if (!cancelled) setIsTranslating(false);
    });
    return () => { cancelled = true; };
  }, [language, nowPlaying]);

  // Check if current track is saved whenever nowPlaying changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tingo_saved_tracks");
      if (saved) {
        const tracks = JSON.parse(saved);
        const exists = tracks.some((t: any) => t.title === nowPlaying.title && t.artist === nowPlaying.artist);
        setIsSaved(exists);
      }
    } catch (e) { }
  }, [nowPlaying]);

  const toggleSave = () => {
    try {
      const saved = localStorage.getItem("tingo_saved_tracks");
      let tracks = saved ? JSON.parse(saved) : [];
      
      if (isSaved) {
        tracks = tracks.filter((t: any) => !(t.title === nowPlaying.title && t.artist === nowPlaying.artist));
      } else {
        tracks.push({
          id: Date.now().toString(),
          title: nowPlaying.title,
          artist: nowPlaying.artist,
          coverUrl: nowPlaying.coverUrl,
          savedAt: Date.now()
        });
      }
      
      localStorage.setItem("tingo_saved_tracks", JSON.stringify(tracks));
      setIsSaved(!isSaved);
      window.dispatchEvent(new Event("tingo_tracks_updated"));
    } catch (e) {
      console.error("Save failed", e);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: nowPlaying.title,
        text: `Listen to ${nowPlaying.title} by ${nowPlaying.artist} on Tingo AI Radio!`,
        url: window.location.href,
      }).catch(() => {});
    }
  };

  const fetchAlbumArt = async (artist: string, title: string) => {
    try {
      // Clean up common Youtube/Spotify tags from the title to improve search match rate
      const cleanTitle = title
        .replace(/\(official.*?\)/i, "")
        .replace(/\[official.*?\]/i, "")
        .replace(/\(lyric.*?\)/i, "")
        .replace(/\[lyric.*?\]/i, "")
        .replace(/\(audio.*?\)/i, "")
        .replace(/\[audio.*?\]/i, "")
        .replace(/\(music video.*?\)/i, "")
        .replace(/\[music video.*?\]/i, "")
        .replace(/ ft\. .*$/i, "")
        .replace(/ feat\. .*$/i, "")
        .trim();
        
      const query = encodeURIComponent(`${artist} ${cleanTitle}`);
      const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=1`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        // iTunes returns 100x100, we replace to get 500x500
        return data.results[0].artworkUrl100.replace('100x100bb', '500x500bb');
      }
    } catch (e) {
      console.error("Failed to fetch iTunes art:", e);
    }
    return "/LLAMA.png";
  };

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://1dd7-2409-40f0-46-1752-4495-2514-4da2-caaf.ngrok-free.app";
    
    let lastArtist = "";
    let lastTitle = "";

    const checkStatus = async () => {
      try {
        const res = await fetch(`${apiBase}/api/status`);
        if (res.ok) {
          const data = await res.json();
          const newTitle = data.now_playing_title || (data.current_show_name || "Tingo Live");
          const newArtist = data.now_playing_artist || "Ife & Dozy";
          const newType = data.now_playing_type || data.current_segment || "show";

          if (newTitle !== lastTitle || newArtist !== lastArtist) {
            lastTitle = newTitle;
            lastArtist = newArtist;
            
            let cover = "/LLAMA.png";
            if (newType === "ad") cover = "/TingoAd.png"; // Fallback, could be branding
            else if (newType === "music" && newArtist && newTitle) {
               cover = await fetchAlbumArt(newArtist, newTitle);
            }
            
            setNowPlaying({
              title: newTitle,
              artist: newArtist,
              type: newType,
              coverUrl: cover,
            });
          }
        }
      } catch (err) {}
    };

    if (isPlaying) {
      checkStatus();
      const interval = setInterval(checkStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  return (
    <div className="flex flex-col items-center w-full max-w-[90vw] sm:max-w-lg mx-auto relative z-30">
      <div className="w-full bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 flex flex-col items-center shadow-[0_0_50px_rgba(0,0,0,0.5)]">
      
      {/* Artwork Section */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full flex justify-center mb-8 pointer-events-auto"
          >
            <div className={isMobile ? "scale-90" : "scale-100"}>
              <MusicArtwork 
                artist={nowPlaying.artist} 
                music={nowPlaying.title} 
                albumArt={nowPlaying.coverUrl} 
                isSong={true}
                isLoading={false}
                externalIsPlaying={true}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Track Info (Only visible when playing) */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center w-full px-4 mb-6"
          >
            <motion.h2
              key={displayTitle}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: isTranslating ? 0.4 : 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-2xl sm:text-3xl font-black text-white truncate max-w-full drop-shadow-md"
            >
              {displayTitle}
            </motion.h2>
            <motion.p
              key={displayArtist}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: isTranslating ? 0.4 : 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="text-white/60 font-medium text-sm sm:text-base mt-1 tracking-wide truncate max-w-full"
            >
              {displayArtist}
            </motion.p>
            {language !== 'en' && nowPlaying.type !== 'music' && (
              <p className="text-white/25 text-[10px] mt-1.5 tracking-wide">
                {isTranslating ? 'Translating...' : `Translated`}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div key="actions"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex items-center justify-center gap-5 sm:gap-4 dark mb-6 pointer-events-auto z-20"
          >
            <MicroExpander onClick={toggleSave} icon={<Heart className="w-5 h-5" />} isActive={isSaved} text={isSaved ? "Saved" : "Save Track"} />
            <MicroExpander onClick={handleShare} icon={<Share2 className="w-5 h-5" />} isActive={false} text="Share" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player Controls (Always visible block) */}
      <div className="flex flex-col items-center gap-4 w-full">
        <AnimatePresence>
          {!isPlaying && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-white/40 text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase mb-1 animate-pulse pointer-events-none"
            >
              Tap to tune in
            </motion.div>
          )}
        </AnimatePresence>

        {/* Play Button Row */}
        <div className="w-full flex items-center justify-center gap-6 sm:gap-8 mb-2 pointer-events-auto">
          {/* Left spacer to keep play button perfectly centered on mobile (MicroExpander is 56px wide) */}
          <div className="w-[56px] h-[56px] md:hidden flex-shrink-0" />
          
          <div className="p-2 rounded-full border border-white/10 shadow-2xl flex items-center justify-center hover:border-white/30 cursor-pointer z-10 transition-colors bg-black/60 backdrop-blur-md">
             <MusicToggleButton onPlayChange={setIsPlaying} volume={volume} />
          </div>

          {/* Mobile Chat Toggle right side */}
          <div className="md:hidden flex items-center justify-center flex-shrink-0">
             <MicroExpander onClick={onChatToggle || (() => {})} icon={<MessageCircle className="w-5 h-5" />} isActive={false} text="Chat" />
          </div>
        </div>

        {/* Volume Bar */}
        <div className="pointer-events-auto w-56 flex items-center justify-center mb-4">
          <MinimalVolumeBar onVolumeChange={setVolume} />
        </div>
      </div>
      </div>
    </div>
  );
}
