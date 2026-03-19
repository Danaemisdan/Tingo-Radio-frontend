"use client";

import React, { useRef, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { InteractiveHoverButton } from './ui/interactive-hover-button';

export interface Project {
    id: string;
    artist: string;
    album: string;
    song: string;
    time: string;
    status: 'LIVE' | 'QUEUED' | 'SCHEDULED';
}

interface MusicPortfolioProps {
    queue: Project[];
}

const QueueRow = ({ project, index }: { project: Project; index: number }) => {
    // We want the total row height to be huge to allow the massive numbers to fit.
    const isLive = project.status === 'LIVE';

    // Extract a 2-digit number for the huge dial indicator
    let bigText = project.time.replace(/[^0-9]/g, '');
    if (!bigText || bigText.length < 2) bigText = (index * 10 + 80).toString(); // Fallback to 80, 90, 100... like the screenshot
    if (bigText.length > 3) bigText = bigText.substring(0, 2);

    return (
        <div className="relative flex w-full h-[360px] border-b border-white/10 pointer-events-none">
            {/* Left Huge Typo Column (40% width) */}
            <div className="w-[45%] h-full flex items-center justify-end pr-8 md:pr-16 border-r border-white/10">
                <span className="text-[200px] md:text-[280px] font-medium tracking-tighter leading-[0.8] text-white select-none opacity-80 mix-blend-overlay">
                    {bigText}
                </span>
            </div>

            {/* Right Details Grid (60% width) */}
            <div className="flex-1 h-full relative">
                {/* Horizontal scale lines reproducing the analog ruler */}
                <div className="absolute inset-0 flex flex-col justify-between py-0 pointer-events-none z-0">
                    {[...Array(20)].map((_, i) => (
                        <div key={i} className="w-full flex items-center gap-3 opacity-40">
                            <span className="text-[10px] font-mono w-4 text-right text-black font-semibold">
                                {i % 4 === 0 ? `0${i}` : ''}
                            </span>
                            <div className="h-[1px] flex-1 bg-zinc-500" />
                        </div>
                    ))}
                </div>

                {/* Track Content Blocks sitting on the layout */}
                <div className="relative z-10 w-full h-full flex items-center px-8 md:px-16 pointer-events-auto">
                    <div className="flex flex-col gap-3">
                        <span className="font-mono text-xs text-white font-extrabold uppercase tracking-widest bg-black/40 backdrop-blur-md px-3 py-1 inline-block w-max border border-white/10 rounded-sm">
                            {project.status === 'LIVE' ? 'ON AIR' : project.status === 'QUEUED' ? 'UP NEXT' : 'SCHEDULED'}
                        </span>
                        <h3 className="text-5xl md:text-7xl font-black tracking-tighter text-white uppercase inline-block pointer-events-auto cursor-pointer hover:underline decoration-4 underline-offset-8 drop-shadow-md">
                            {project.song}
                        </h3>
                        <p className="font-mono text-sm tracking-widest text-[#FF8E5E] uppercase inline-block font-bold">
                            {project.artist} {"//"} {project.album}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function MusicPortfolio({ queue }: MusicPortfolioProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const liveIndex = queue.findIndex(q => q.status === 'LIVE');

    // Auto scroll so the 'LIVE' track centers on the red playhead on mount
    useEffect(() => {
        if (scrollContainerRef.current && liveIndex !== -1) {
            const rowHeight = 360; // Must match the h-[360px] in QueueRow
            const screenHeight = window.innerHeight;
            // Scroll to center the row vertically in the viewport
            scrollContainerRef.current.scrollTop = (liveIndex * rowHeight) - (screenHeight / 2) + (rowHeight / 2);
        }
    }, [liveIndex]);

    return (
        <div className="w-full h-screen fixed inset-0 bg-transparent text-white overflow-hidden select-none">

            {/* Center Fixed Red Playhead (cuts through the entire screen) */}
            <div className="absolute top-1/2 left-0 right-0 w-full h-[2px] bg-[#ff3b30] z-50 pointer-events-none shadow-[0_0_15px_rgba(255,59,48,0.5)]">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#ff3b30] shadow-[0_0_15px_rgba(255,59,48,0.8)]" />
            </div>

            {/* Top Bar overlays (mimicking the status bar / simple branding) */}
            <div className="absolute top-0 w-full p-8 flex justify-between items-start z-40 pointer-events-none">
                <div className="text-white font-bold text-2xl tracking-tighter bg-black/40 backdrop-blur-md px-4 py-1 rounded-sm border border-white/5 mix-blend-normal">
                    TINGO AI RADIO
                </div>
                <div onClick={() => router.push('/')} className="pointer-events-auto">
                    <InteractiveHoverButton
                        text="Back to Home"
                        className="w-[180px] h-10 px-0 bg-white text-black rounded-full text-base border border-black/10 shadow-md group-hover:shadow-[0_0_20px_rgba(255,107,53,0.5)]"
                    />
                </div>
            </div>

            {/* Bottom Left Branding (like the 106.1 in the reference) */}
            <div className="absolute bottom-8 left-8 md:bottom-12 md:left-12 z-40 pointer-events-none mix-blend-overlay">
                <h1 className="text-7xl md:text-9xl font-medium tracking-tighter text-white leading-none opacity-40">
                    LIVE.
                </h1>
            </div>

            {/* Bottom Center Branding */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-40 pointer-events-none mix-blend-normal hidden md:block">
                <span className="font-mono text-xs tracking-[0.3em] font-bold uppercase text-white/50">
                    GLOBAL STREAM
                </span>
            </div>

            {/* The Scrollable Analog Dial Container */}
            <div
                ref={scrollContainerRef}
                className="w-full h-full overflow-y-auto no-scrollbar scroll-smooth relative z-10"
                style={{ scrollSnapType: 'y mandatory', padding: '50vh 0' }} // Padding ensures we can scroll first/last items to the center
            >
                {queue.map((project, idx) => (
                    <div key={project.id} className="w-full" style={{ scrollSnapAlign: 'center' }}>
                        <QueueRow project={project} index={idx} />
                    </div>
                ))}
            </div>

        </div>
    );
}
