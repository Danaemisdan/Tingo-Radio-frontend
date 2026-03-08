"use client"

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from "framer-motion"
import { InteractiveHoverButton } from './ui/interactive-hover-button';
import MusicArtwork from '@/components/ui/music-artwork';
import { SiriOrb } from '@/components/ui/siri-orb';
import Link from 'next/link';
import { BentoGridDark } from '@/components/ui/bento';
interface LandingPageProps {
    onEnterRadio: () => void;
}

export default function LandingPage({ onEnterRadio }: LandingPageProps) {
    const [isFadingOut, setIsFadingOut] = useState(false);

    const handleEnterRadio = () => {
        setIsFadingOut(true);
        // Add a slight delay to allow the fade out animation to play
        setTimeout(() => {
            onEnterRadio();
        }, 800);
    };

    return (
        <div className="flex flex-col min-h-screen bg-black text-white w-full relative overflow-hidden">
            <AnimatePresence>
                {isFadingOut && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.0, ease: "easeInOut" }}
                        className="fixed inset-0 z-[9999] bg-black pointer-events-none"
                    />
                )}
            </AnimatePresence>
            {/* Global Top-Edge Cyan/Blue Aurora Background */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="absolute top-0 left-0 w-full h-[800px] pointer-events-none z-0 overflow-hidden"
            >
                {/* Solid top base to ensure the edge is colored uniformly */}
                <div className="absolute top-0 left-0 right-0 h-[60%] bg-gradient-to-b from-[#06b6d4] via-[#0284c7]/30 to-transparent" />

                {/* Flowing animated gradient hotspots */}
                <motion.div
                    className="absolute -top-[10%] left-[-20%] w-[60%] h-[70%] bg-[#67e8f9] blur-[150px] rounded-full mix-blend-screen opacity-70"
                    animate={{ x: ['0vw', '40vw', '0vw'] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute -top-[10%] right-[-20%] w-[60%] h-[70%] bg-[#38bdf8] blur-[150px] rounded-full mix-blend-screen opacity-60"
                    animate={{ x: ['0vw', '-40vw', '0vw'] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute -top-[5%] left-[20%] w-[60%] h-[60%] bg-[#22d3ee] blur-[140px] rounded-full mix-blend-color-dodge opacity-50"
                    animate={{ x: ['-20vw', '30vw', '-20vw'] }}
                    transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Deep fade into page background */}
                <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-black via-black/80 to-transparent" />
            </motion.div>

            {/* Navigation Layer */}
            <motion.nav
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.0, delay: 0.5, ease: "easeOut" }}
                className="flex justify-end items-center py-8 px-6 max-w-7xl mx-auto w-full absolute top-0 right-0 z-50"
            >
                <div onClick={handleEnterRadio}>
                    <InteractiveHoverButton
                        text="Listen Now"
                        showSynthIcon={true}
                        className="w-[180px] h-10 px-0 bg-white text-black rounded-full text-base border-none shadow-md group-hover:shadow-[0_0_20px_rgba(255,107,53,0.5)]"
                    />
                </div>
            </motion.nav>

            {/* ---------------- HERO SECTION ---------------- */}
            <main className="pb-16 md:py-28 relative z-10 w-full flex-1">
                <div className="mx-auto max-w-6xl space-y-2 px-6">
                    {/* Tingo Bird Logo with Background Gradient Text */}
                    <div className="w-full relative h-[350px] md:h-[450px] flex flex-row items-center justify-center overflow-visible z-10 px-2 sm:px-4">
                        {/* Left Text */}
                        <h1 className="text-[11vw] sm:text-[9vw] md:text-[8vw] lg:text-[7vw] xl:text-[8rem] whitespace-nowrap font-black tracking-tighter leading-[1.3] py-8 px-2 sm:px-6 text-transparent bg-clip-text bg-gradient-to-br from-[#FF6B35] via-[#FF8E5E] to-[#22d3ee] mix-blend-screen text-right z-10">
                            Tingo AI
                        </h1>

                        {/* The Bird Logo */}
                        <div className="shrink-0 flex items-center justify-center z-20 pointer-events-none -mx-2 sm:-mx-4 md:-mx-6 lg:-mx-8">
                            <motion.img
                                layoutId="tingo-logo"
                                src="/NewLogo.svg"
                                alt="Tingo Logo"
                                className="w-[30vw] sm:w-[25vw] md:w-[20vw] lg:w-[280px] xl:w-[350px] drop-shadow-2xl pointer-events-auto relative"
                                transition={{ layout: { duration: 1.5, ease: [0.16, 1, 0.3, 1] } }}
                            />
                        </div>

                        {/* Right Text */}
                        <h1 className="text-[11vw] sm:text-[9vw] md:text-[8vw] lg:text-[7vw] xl:text-[8rem] whitespace-nowrap font-black tracking-tighter leading-[1.3] py-8 px-2 sm:px-6 text-transparent bg-clip-text bg-gradient-to-br from-[#FF6B35] via-[#FF8E5E] to-[#22d3ee] mix-blend-screen text-left z-10">
                            Radio
                        </h1>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.0, delay: 0.8, ease: "easeOut" }}
                        className="grid gap-6 md:grid-cols-2 md:gap-12 mt-8 md:mt-16"
                    >
                        <h1 className="text-5xl md:text-6xl font-bold text-white leading-[1.1] tracking-tighter">
                            The next generation{" "}
                            <span className="text-zinc-500 font-medium">
                                of <span className="text-[#FF6B35] drop-shadow-[0_0_15px_rgba(255,107,53,0.2)]">autonomous AI radio</span> broadcasting.
                            </span>
                        </h1>
                        <div className="space-y-8 text-zinc-400">
                            <p className="text-lg md:text-xl font-medium tracking-tight leading-relaxed max-w-md">
                                Tingo is evolving to be more than just a stream. It supports an entire ecosystem —
                                from live curation to interactive hosts helping listeners discover new music.
                            </p>

                            <div className="flex items-center gap-6 mt-12">
                                <div onClick={handleEnterRadio} className="cursor-pointer">
                                    <InteractiveHoverButton
                                        text="Tune into the Radio"
                                        showSynthIcon={true}
                                        className="w-[280px] h-14 px-0 bg-white text-black rounded-full text-lg border-none shadow-xl group-hover:shadow-[0_0_30px_rgba(255,107,53,0.6)]"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>

            {/* ---------------- FEATURES SECTION ---------------- */}
            <div className="relative z-10 bg-black">
                <BentoGridDark />
            </div>


            {/* ---------------- SCENIC STATIC FOOTER ---------------- */}
            <footer className="relative w-full h-[500px] md:h-[600px] flex flex-col items-center justify-end pb-12 overflow-hidden border-t border-white/5 mt-12">
                {/* Beautiful vibrant scenery background */}
                <div className="absolute inset-0 z-0 bg-black">
                    <img
                        src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=2400&auto=format&fit=crop"
                        alt="Scenic Background"
                        className="w-full h-full object-cover opacity-60 mix-blend-screen"
                    />
                    {/* Gradient fade from black at top to transparent at bottom */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black via-black/40 to-black/80 z-10" />
                </div>

                <div className="relative z-20 flex flex-col items-center w-full">
                    <img
                        src="/tingo_logo_minimal.svg"
                        alt="Tingo Logo"
                        className="w-[150px] md:w-[250px] mb-8 drop-shadow-2xl"
                    />
                    <p className="text-white/60 text-xs tracking-widest uppercase font-medium drop-shadow-md">
                        © 2026 TINGO AI. ALL RIGHTS RESERVED.
                    </p>
                </div>
            </footer>

        </div>
    )
}
