import { motion } from "framer-motion";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface MusicToggleButtonProps {
    isPlaying: boolean;
    onClick: () => void;
    className?: string;
}

export function MusicToggleButton({ isPlaying, onClick, className }: MusicToggleButtonProps) {
    return (
        <div className={cn("flex flex-col items-center gap-6 w-full max-w-sm", className)}>

            {/* Brutalist Play Button */}
            <button
                onClick={onClick}
                className="relative group active:scale-95 transition-transform"
            >
                <div className={cn(
                    "px-12 py-4 bg-[#0a0a0a] border-2 border-zinc-700 flex items-center justify-center gap-4 transition-colors",
                    isPlaying ? "border-white bg-zinc-900" : "hover:border-zinc-400 group-hover:bg-zinc-900"
                )}>
                    <span className="text-white font-mono font-bold tracking-[0.2em]">
                        {isPlaying ? 'PAUSE' : 'PLAY'}
                    </span>
                    {isPlaying ? (
                        <Pause className="w-5 h-5 text-white fill-white" />
                    ) : (
                        <Play className="w-5 h-5 text-zinc-400 fill-zinc-400 group-hover:text-white group-hover:fill-white transition-colors" />
                    )}
                </div>
            </button>

            {/* Dot-Matrix Equalizer */}
            <div className="flex gap-2 h-10 items-end justify-center w-full px-8 opacity-80">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="flex flex-col gap-[2px] justify-end h-full flex-1">
                        {[...Array(5)].map((_, j) => (
                            <motion.div
                                key={j}
                                className="w-full aspect-[2/1] bg-white opacity-20"
                                animate={isPlaying ? {
                                    opacity: [0.2, 0.9, 0.2],
                                    scaleY: [1, 1.2, 1]
                                } : { opacity: 0.2, scaleY: 1 }}
                                transition={{
                                    duration: 0.4 + Math.random() * 0.4,
                                    repeat: Infinity,
                                    delay: Math.random() * 0.5,
                                    ease: "easeInOut"
                                }}
                            />
                        ))}
                    </div>
                ))}
            </div>

        </div>
    );
}
