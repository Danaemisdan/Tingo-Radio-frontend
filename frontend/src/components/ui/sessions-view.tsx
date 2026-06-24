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

      {/* Empty State / Coming Soon */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
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
    </div>
  );
}
