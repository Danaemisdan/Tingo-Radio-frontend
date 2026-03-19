import Image from "next/image";
import { cn } from "@/lib/utils";

interface MusicArtworkProps {
    albumArt: string;
    artist: string;
    music: string;
    isSong?: boolean;
    isPlaying?: boolean;
    onTogglePlay?: () => void;
    className?: string;
}

export default function MusicArtwork({
    albumArt,
    artist,
    music,
    isSong = false,
    isPlaying = false,
    onTogglePlay,
    className,
}: MusicArtworkProps) {
    return (
        <div className={cn("relative flex items-center justify-center p-4 cursor-pointer", className)} onClick={onTogglePlay}>
            <div className="relative w-full max-w-sm aspect-square bg-[#0a0a0a] border border-zinc-800 p-6 flex flex-col group hover:border-zinc-500 transition-colors">

                {/* Top Info Bar */}
                <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
                    <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">{artist}</span>
                    <span className="text-xs font-mono text-zinc-500">{isSong ? 'A-SIDE' : 'SYSTEM'}</span>
                </div>

                {/* Artwork Image & Vinyl Container */}
                <div className="relative flex-1 mb-4 flex items-center justify-center overflow-visible group">

                    {/* Vinyl Record */}
                    <div className={cn(
                        "absolute inset-0 m-auto w-[90%] h-[90%] rounded-full bg-zinc-950 border border-zinc-800 shadow-xl flex items-center justify-center transition-all duration-[1500ms] ease-[cubic-bezier(0.25,1,0.5,1)]",
                        isPlaying ? "translate-x-[45%] rotate-180" : "translate-x-0 rotate-0"
                    )}>
                        <div className={cn("w-full h-full rounded-full flex items-center justify-center relative",
                            isPlaying ? "animate-[spin_4s_linear_infinite]" : ""
                        )}
                            style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
                        >
                            {/* Vinyl Grooves */}
                            <div className="absolute inset-2 rounded-full border border-zinc-800/60" />
                            <div className="absolute inset-5 rounded-full border border-zinc-800/50" />
                            <div className="absolute inset-8 rounded-full border border-zinc-800/40" />
                            <div className="absolute inset-12 rounded-full border border-zinc-800/30" />
                            <div className="absolute inset-16 rounded-full border border-zinc-800/20" />

                            {/* Center Label */}
                            <div className="w-1/3 h-1/3 rounded-full bg-[#FF6B35] border-4 border-zinc-900 flex items-center justify-center shadow-inner relative overflow-hidden group/label">
                                <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent z-10" />
                                {/* Tingo Bird Logo on the Vinyl */}
                                <div className="absolute inset-0 flex items-center justify-center p-2 opacity-80 mix-blend-multiply">
                                    <Image src="/tingo-bird.svg" alt="Tingo Vinyl Label" fill className="object-contain p-2" />
                                </div>
                                <div className="w-3 h-3 rounded-full bg-black shadow-sm z-20 border border-zinc-700" />
                            </div>
                        </div>
                    </div>

                    {/* Album Art Cover */}
                    <div className="relative w-full h-full bg-zinc-900 border border-zinc-800 overflow-hidden group z-10 shadow-2xl">
                        <Image
                            src={albumArt}
                            alt="Album Art"
                            fill
                            className={cn(
                                "object-cover transition-all duration-700 ease-out grayscale group-hover:grayscale-0",
                                isPlaying ? "scale-100 mix-blend-normal" : "scale-105 opacity-50 mix-blend-luminosity"
                            )}
                        />
                        {/* Scanline Overlay */}
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjIiIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4yIi8+PC9zdmc+')] pointer-events-none opacity-50" />
                    </div>
                </div>

                {/* Bottom Info Bar */}
                <div className="flex flex-col gap-1">
                    <h3 className="text-2xl font-bold tracking-tighter uppercase text-white truncate group-hover:text-zinc-300 transition-colors">
                        {music}
                    </h3>
                    <div className="h-1 w-full bg-zinc-900 relative mt-2">
                        <div className={cn("absolute inset-y-0 left-0 bg-white transition-all duration-1000", isPlaying ? "w-full" : "w-1/3")} />
                    </div>
                </div>

            </div>

            {/* Active Play Gradient Glow */}
            <div className={cn(
                "absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-[#FF6B35] rounded-full blur-[60px] opacity-0 transition-opacity duration-1000 pointer-events-none",
                isPlaying ? "opacity-30" : "opacity-0"
            )} />
        </div>
    );
}
