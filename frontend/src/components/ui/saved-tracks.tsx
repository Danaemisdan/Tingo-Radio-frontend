"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Play, Share2, Trash2 } from "lucide-react";
import Image from "next/image";

export interface SavedTrack {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  savedAt: number;
}

export function SavedTracksView() {
  const [tracks, setTracks] = useState<SavedTrack[]>([]);

  useEffect(() => {
    const loadTracks = () => {
      try {
        const saved = localStorage.getItem("tingo_saved_tracks");
        if (saved) {
          setTracks(JSON.parse(saved).sort((a: SavedTrack, b: SavedTrack) => b.savedAt - a.savedAt));
        }
      } catch (e) {
        console.error("Failed to load saved tracks", e);
      }
    };
    loadTracks();
    
    // Listen for custom event to update in real-time if a track is saved while viewing
    window.addEventListener("tingo_tracks_updated", loadTracks);
    return () => window.removeEventListener("tingo_tracks_updated", loadTracks);
  }, []);

  const removeTrack = (id: string) => {
    const updated = tracks.filter(t => t.id !== id);
    setTracks(updated);
    localStorage.setItem("tingo_saved_tracks", JSON.stringify(updated));
    window.dispatchEvent(new Event("tingo_tracks_updated"));
  };

  const shareTrack = (track: SavedTrack) => {
    if (navigator.share) {
      navigator.share({
        title: track.title,
        text: `Listen to ${track.title} by ${track.artist} on Tingo AI Radio!`,
        url: window.location.href,
      }).catch(() => {});
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 pb-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-8"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
          <Heart className="w-8 h-8 text-white fill-white" />
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Saved Tracks</h1>
          <p className="text-white/50 mt-1">{tracks.length} {tracks.length === 1 ? 'song' : 'songs'}</p>
        </div>
      </motion.div>

      {tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Heart className="w-12 h-12 text-white/10 mb-4" />
          <h3 className="text-xl font-medium text-white/50">No saved tracks yet</h3>
          <p className="text-white/30 text-sm mt-2 max-w-xs">
            When you hear a song you like on Tingo Radio, tap the heart icon to save it here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tracks.map((track, i) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group flex items-center gap-4 p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.02] hover:border-white/[0.1] transition-all"
            >
              <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-white/5">
                <Image src={track.coverUrl || "/LLAMA.png"} alt={track.title} fill className="object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Play className="w-6 h-6 text-white fill-white" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-semibold text-white truncate">{track.title}</h4>
                <p className="text-sm text-white/50 truncate">{track.artist}</p>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => shareTrack(track)}
                  className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => removeTrack(track.id)}
                  className="p-2 text-white/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-full transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
