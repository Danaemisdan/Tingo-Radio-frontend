"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music2, Search, Play } from "lucide-react";
import Image from "next/image";

interface Song {
  filename: string;
  artist: string;
  title: string;
  coverUrl?: string;
}

// Group songs by first letter of artist
function groupByArtist(songs: Song[]): Record<string, Song[]> {
  const grouped: Record<string, Song[]> = {};
  for (const song of songs) {
    const key = song.artist[0]?.toUpperCase() || "#";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(song);
  }
  return grouped;
}

export function MusicLibraryView() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    fetch(`${apiBase}/api/songs`)
      .then((r) => r.json())
      .then(async (data) => {
        const raw: Song[] = data.songs || [];
        // Fetch iTunes art for each song in batches
        const enriched = await Promise.all(
          raw.map(async (song) => {
            try {
              const q = encodeURIComponent(`${song.artist} ${song.title}`);
              const res = await fetch(`https://itunes.apple.com/search?term=${q}&entity=song&limit=1`);
              const d = await res.json();
              if (d.results?.[0]?.artworkUrl100) {
                return { ...song, coverUrl: d.results[0].artworkUrl100.replace("100x100bb", "300x300bb") };
              }
            } catch {}
            return { ...song, coverUrl: "/LLAMA.png" };
          })
        );
        setSongs(enriched);
      })
      .catch(() => setSongs([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = songs.filter((s) => {
    const q = search.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);
  });

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 pb-32">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Music2 className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Tingo Sounds</h1>
          <p className="text-white/50 mt-1">{songs.length} tracks · Afrobeats &amp; beyond</p>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search songs or artists..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 focus:bg-white/8 transition-all"
        />
      </motion.div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-2 border-white/10 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Loading the vault...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center gap-3">
          <Music2 className="w-10 h-10 text-white/10" />
          <p className="text-white/40 text-sm">No tracks found for &ldquo;{search}&rdquo;</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {/* Column headers */}
          <div className="grid grid-cols-[48px_1fr_1fr_40px] gap-4 px-3 pb-2 border-b border-white/5 text-white/30 text-xs font-medium uppercase tracking-widest">
            <span>#</span>
            <span>Title</span>
            <span className="hidden sm:block">Artist</span>
            <span />
          </div>

          {filtered.map((song, i) => (
            <motion.div
              key={song.filename}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.015, 0.4) }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="group grid grid-cols-[48px_1fr_1fr_40px] gap-4 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] transition-all items-center cursor-pointer"
            >
              {/* Track number / Play icon */}
              <div className="flex items-center justify-center w-10 h-10 relative">
                <span className={`text-white/40 text-sm font-medium transition-opacity ${hoveredIdx === i ? "opacity-0" : "opacity-100"}`}>
                  {i + 1}
                </span>
                <Play
                  className={`absolute w-4 h-4 text-white fill-white transition-opacity ${hoveredIdx === i ? "opacity-100" : "opacity-0"}`}
                />
              </div>

              {/* Art + Title */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white/5">
                  <Image
                    src={song.coverUrl || "/LLAMA.png"}
                    alt={song.title}
                    fill
                    className="object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/LLAMA.png"; }}
                  />
                </div>
                <span className="text-white text-sm font-medium truncate">{song.title}</span>
              </div>

              {/* Artist */}
              <span className="hidden sm:block text-white/50 text-sm truncate">{song.artist}</span>

              {/* Subtle play glow on hover */}
              <div className={`w-2 h-2 rounded-full bg-emerald-500 transition-opacity ${hoveredIdx === i ? "opacity-100" : "opacity-0"}`} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
