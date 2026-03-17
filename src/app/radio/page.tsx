"use client";

import React, { useState } from 'react';
import HeroWave from '@/components/ui/dynamic-wave-canvas-background';
import { Heart, Share2, ListPlus } from 'lucide-react';
import { MicroExpander } from '@/components/ui/micro-expander';
import { MusicToggleButton } from '@/components/ui/music-toggle-btn';
import { CallPopout } from '@/components/ui/call-popout';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { MinimalVolumeBar } from '@/components/ui/minimal-volume-bar';
import { LiveChat } from '@/components/ui/live-chat';

export default function RadioPage() {
    const [isPlaying, setIsPlaying] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [volume, setVolume] = useState(50);

    return (
        <main className="relative min-h-screen w-full bg-black text-white overflow-hidden selection:bg-white/30">

            {/* Tingo Logo — top left */}
            <div className="absolute top-8 left-8 z-50">
                <Image
                    src="/tingo_logo_minimal.svg"
                    alt="Tingo Logo"
                    width={100}
                    height={35}
                    className="opacity-100 cursor-pointer block"
                />
            </div>

            {/* Fade-in from black */}
            <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1.0, ease: "easeInOut" }}
                className="fixed inset-0 z-[9999] bg-black pointer-events-none"
            />

            {/* Wave background */}
            <div className="absolute inset-0 z-0 opacity-80 pointer-events-none">
                <HeroWave />
            </div>

            {/* Aurora when playing */}
            <AnimatePresence>
                {isPlaying && (
                    <motion.div
                        key="aurora"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                        className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
                    >
                        <motion.div
                            className="absolute top-[20%] left-[10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-[#FF6B35] blur-[150px] rounded-full mix-blend-screen opacity-40"
                            animate={{ scale: [1, 1.2, 1], x: ['0%', '10%', '0%'], y: ['0%', '-10%', '0%'] }}
                            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <motion.div
                            className="absolute bottom-[10%] right-[10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-[#22d3ee] blur-[150px] rounded-full mix-blend-screen opacity-30"
                            animate={{ scale: [1, 1.3, 1], x: ['0%', '-15%', '0%'], y: ['0%', '10%', '0%'] }}
                            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <motion.div
                            className="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-[#FF8E5E] blur-[120px] rounded-full mix-blend-screen opacity-30"
                            animate={{ scale: [1, 1.4, 1], x: ['0%', '20%', '0%'], y: ['0%', '20%', '0%'] }}
                            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Main Player Controls — centered, shifts left when chat is open ── */}
            <motion.div
                animate={{ x: isPlaying ? -160 : 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center"
            >
                {/* Program card pop-up */}
                <div className="h-16 flex items-end justify-center pointer-events-auto relative">
                    <AnimatePresence>
                        {isPlaying && (
                            <motion.div
                                key="program-card"
                                initial={{ opacity: 0, scale: 0, y: 50, filter: "blur(20px)" }}
                                animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                                exit={{ opacity: 0, scale: 0, y: 50, filter: "blur(20px)" }}
                                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                style={{ transformOrigin: "bottom center" }}
                                className="absolute bottom-full mb-2 w-[350px] rounded-[2rem] bg-zinc-950/95 backdrop-blur-3xl border border-white/10 p-5 shadow-[0_0_50px_rgba(0,0,0,0.8)] pointer-events-auto flex flex-col gap-4 z-[100]"
                            >
                                <div className="w-full aspect-square rounded-[1.25rem] overflow-hidden bg-black shrink-0 relative shadow-inner ring-1 ring-white/10">
                                    <Image src="/LLAMA.png" fill className="object-cover" alt="LLAMA" />
                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                                    <div className="absolute bottom-4 left-5 z-10 flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,1)]" />
                                        <span className="text-red-500 font-bold text-sm tracking-[0.2em] uppercase drop-shadow-md">Live</span>
                                    </div>
                                </div>
                                <div className="flex flex-col min-w-0 w-full text-left px-2 pb-2">
                                    <span className="text-3xl font-bold text-white truncate mb-1">LLAMA</span>
                                    <span className="text-base text-white/70 font-medium truncate">Ife Mi in the mix</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Action buttons */}
                {isPlaying && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="flex items-center justify-center gap-4 dark mb-4 pointer-events-auto z-20"
                    >
                        <MicroExpander icon={<Heart className="w-5 h-5" />} isActive={false} text="Like Track" />
                        <MicroExpander icon={<ListPlus className="w-5 h-5" />} isActive={true} text="Save Set" />
                        <MicroExpander icon={<Share2 className="w-5 h-5" />} isActive={false} text="Share" />
                    </motion.div>
                )}

                <div className="flex flex-col items-center gap-4 mt-2">
                    <span className="text-white/40 font-mono text-[10px] uppercase tracking-widest pointer-events-none transition-opacity">
                        {isPlaying ? "ON AIR" : "Click here to play"}
                    </span>

                    {/* Play bar row */}
                    <div className="flex items-center justify-center gap-6 w-full max-w-lg mb-8 pointer-events-none">
                        {/* Spacer (removed old single chat popout) */}
                        <div className="w-12 h-12" />

                        {/* Center: Music Toggle */}
                        <div className="bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-2xl pointer-events-auto flex items-center justify-center transition-colors hover:border-white/30 cursor-pointer shrink-0 z-10">
                            <MusicToggleButton onPlayChange={setIsPlaying} />
                        </div>

                        {/* Right: Call Popout */}
                        {isPlaying ? <CallPopout /> : <div className="w-12 h-12" />}
                    </div>

                    {/* Volume */}
                    <div className="pointer-events-auto mb-6">
                        <MinimalVolumeBar onVolumeChange={setVolume} />
                    </div>
                </div>
            </motion.div>

            {/* ── Twitch-Style Live Chat Sidebar ── */}
            <AnimatePresence>
                {isPlaying && (
                    <motion.aside
                        key="chat-sidebar"
                        initial={{ x: 320, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 320, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 28 }}
                        className="fixed top-0 right-0 h-full w-80 z-40 flex flex-col"
                        style={{
                            background: "linear-gradient(180deg, rgba(5,5,5,0.88) 0%, rgba(10,10,10,0.94) 100%)",
                            backdropFilter: "blur(24px)",
                            WebkitBackdropFilter: "blur(24px)",
                            borderLeft: "1px solid rgba(255,255,255,0.07)",
                        }}
                    >
                        <LiveChat visible={true} />
                    </motion.aside>
                )}
            </AnimatePresence>

        </main>
    );
}
