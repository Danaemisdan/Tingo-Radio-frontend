"use client";

import React from "react";
import { motion } from "framer-motion";
import { Radio, Clock } from "lucide-react";

// Placeholder recorded show entries — in the future these can come from a real API
const MOCK_SESSIONS = [
  {
    id: 1,
    showName: "Tingo Morning Adrenaline",
    episode: "Ep. 12 — AI is taking over our jobs (and we love it)",
    hosts: "Ife & Dozy",
    duration: "42 min",
    date: "Jun 19, 2025",
    gradient: "from-orange-600 to-rose-600",
  },
  {
    id: 2,
    showName: "The Tech Pulse",
    episode: "Ep. 7 — Starlink in Lagos: worth it or overhyped?",
    hosts: "Ife & Dozy",
    duration: "35 min",
    date: "Jun 18, 2025",
    gradient: "from-violet-600 to-indigo-600",
  },
  {
    id: 3,
    showName: "Culture Clash",
    episode: "Ep. 4 — Afrobeats vs Amapiano: who wins 2025?",
    hosts: "Ife & Dozy",
    duration: "51 min",
    date: "Jun 17, 2025",
    gradient: "from-emerald-600 to-teal-600",
  },
  {
    id: 4,
    showName: "Tingo Morning Adrenaline",
    episode: "Ep. 11 — Naira hits record high: celebration or concern?",
    hosts: "Ife & Dozy",
    duration: "38 min",
    date: "Jun 16, 2025",
    gradient: "from-orange-600 to-rose-600",
  },
];

export function SessionsView() {
  const [archives, setArchives] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/archives")
      .then(res => res.json())
      .then(data => {
        setArchives(data.archives || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 pb-32">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Radio className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">The Archive</h1>
          <p className="text-white/50 mt-1">Every session, preserved</p>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>
      ) : archives.length === 0 ? (
        {/* Empty State / Coming Soon */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center px-4 rounded-3xl bg-white/[0.02] border border-white/[0.05]"
        >
          <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center mb-6">
            <Clock className="w-8 h-8 text-white/20" />
          </div>
          <h3 className="text-xl font-semibold text-white/80 mb-2">The Archive is Empty</h3>
          <p className="text-white/40 max-w-sm leading-relaxed text-sm">
            No past sessions have been recorded yet. Once the AI hosts finish a live broadcast, it will automatically be saved and preserved here for playback.
          </p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-4">
          {archives.map((session, i) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.04] transition-all"
            >
              {/* Gradient tile */}
              <div className={`relative w-16 h-16 rounded-xl shrink-0 bg-gradient-to-br ${session.gradient} flex items-center justify-center shadow-lg`}>
                <Radio className="w-7 h-7 text-white/80" />
              </div>

              <div className="flex-1 min-w-0 mb-3 sm:mb-0">
                <p className="text-white/40 text-xs font-medium uppercase tracking-widest mb-0.5">{session.showName}</p>
                <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2">
                  {session.episode}
                </h3>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-white/35 text-xs">{session.hosts}</span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="text-white/35 text-xs">{session.date}</span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="text-white/35 text-xs">{session.duration}</span>
                </div>
              </div>
              
              <audio controls src={session.url} className="w-full sm:w-auto h-10 outline-none" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
