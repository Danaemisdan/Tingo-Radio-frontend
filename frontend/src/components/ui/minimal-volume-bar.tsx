"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MinimalVolumeBarProps {
    onVolumeChange?: (volume: number) => void;
    className?: string;
}

export function MinimalVolumeBar({ onVolumeChange, className }: MinimalVolumeBarProps) {
    const [volume, setVolume] = useState(50);
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Notify parent when volume changes
    useEffect(() => {
        onVolumeChange?.(volume);
    }, [volume, onVolumeChange]);

    const isInputActive = isHovered || isDragging;
    const isHighVolume = volume > 75;

    return (
        <div
            className={cn("relative flex items-center justify-center w-48 h-10 group", className)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* The Invisible Range Input for Native Drag/Touch Support */}
            <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onTouchStart={() => setIsDragging(true)}
                onTouchEnd={() => setIsDragging(false)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            />

            {/* The Visible Bar */}
            <div className="relative w-full h-[3px] bg-white/20 rounded-full overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute top-0 left-0 h-full rounded-full"
                    animate={{
                        width: `${volume}%`,
                        backgroundColor: isHighVolume ? '#ef4444' : '#ffffff'
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 30, bounce: 0 }}
                />
            </div>

            {/* Hover/Drag Percentage Tooltip */}
            <AnimatePresence>
                {isInputActive && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: -24, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className="absolute pointer-events-none z-30 font-mono text-xs font-bold tracking-wider"
                        style={{ color: isHighVolume ? '#ef4444' : '#ffffff' }}
                    >
                        {volume}%
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
