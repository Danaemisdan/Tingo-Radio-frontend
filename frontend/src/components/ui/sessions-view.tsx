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

      {/* Coming soon notice */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-8 px-4 py-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs"
      >
        🎙️ &nbsp;Full session recordings will auto-populate here once recorded shows are enabled in the backend.
        These previews are illustrative.
      </motion.div>

      <div className="flex flex-col gap-4">
        {MOCK_SESSIONS.map((session, i) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.04] hover:border-white/[0.12] transition-all cursor-pointer"
          >
            {/* Gradient tile */}
            <div className={`relative w-16 h-16 rounded-xl shrink-0 bg-gradient-to-br ${session.gradient} flex items-center justify-center shadow-lg`}>
              <Radio className="w-7 h-7 text-white/80" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-white/40 text-xs font-medium uppercase tracking-widest mb-0.5">{session.showName}</p>
              <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2 group-hover:text-white/90 transition-colors">
                {session.episode}
              </h3>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-white/35 text-xs">{session.hosts}</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="flex items-center gap-1 text-white/35 text-xs">
                  <Clock className="w-3 h-3" /> {session.duration}
                </span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-white/35 text-xs">{session.date}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
