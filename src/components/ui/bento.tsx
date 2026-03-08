'use client';

import { clsx } from 'clsx';
import { motion, AnimatePresence, useAnimation, useScroll, useTransform } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { SiriOrb } from "./siri-orb";
import { Phone, MessageCircle, Music, Heart, Calendar } from 'lucide-react';

function ScrollHighlightText({ text }: { text: React.ReactNode }) {
    const containerRef = useRef<HTMLParagraphElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["0 0.95", "1 0.7"]
    });

    if (typeof text !== 'string') return <p>{text}</p>;

    const words = text.split(" ");

    return (
        <p ref={containerRef} className="text-base md:text-lg font-medium leading-relaxed text-transparent bg-clip-text flex flex-wrap gap-x-[0.25em]">
            {words.map((word, i) => {
                const start = i / words.length;
                const end = start + (1 / words.length);
                // "Chalk highlight thingy" - smoothly filling in the white text from a dark grey as the user scrolls
                const color = useTransform(scrollYProgress, [start, end], ["#52525b", "#ffffff"]);
                return (
                    <motion.span key={i} style={{ color }} className="inline-block">
                        {word}
                    </motion.span>
                );
            })}
        </p>
    );
}

export function BentoGridDark() {
    return (
        <div className='py-24 md:py-32 w-full flex flex-col items-center bg-black relative z-20 px-4 md:px-8'>

            {/* Container carefully sized to match the sleek Apple-style aesthetic */}
            <div className='w-full max-w-6xl mx-auto flex flex-col gap-6'>

                {/* Row 1: The large Chat with Ife Mi card & Endless Curation */}
                <div className='flex flex-col md:flex-row gap-6 w-full min-h-[500px]'>

                    {/* Main Left Card: Chat with Ife Mi */}
                    <BentoCard
                        title='Chat with Ife Mi'
                        description='Interact directly with our immersive AI DJ. Request tracks, ask about the current song, or just hang out in real time while you vibe.'
                        graphic={
                            <motion.div
                                className='absolute inset-0 w-full h-full z-0'
                                variants={{
                                    idle: { scale: 1 },
                                    active: { scale: 1.05 }
                                }}
                                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                            >
                                <img
                                    src='/grok-chat.png'
                                    alt='Chat with Ife Mi'
                                    className='w-full h-full object-cover object-top opacity-80 mix-blend-screen'
                                />
                                {/* Clean gradient fade from bottom */}
                                <div className='absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent' />
                            </motion.div>
                        }
                        className='flex-1 md:w-1/2 rounded-3xl'
                    />

                    {/* Top Right Card: Endless Curation */}
                    <BentoCard
                        title='Endless Curation'
                        description='Never run out of beats. Tingo dynamically generates a continuous electronic radio stream perfectly tailored to the current worldwide vibe.'
                        graphic={
                            <div className='absolute inset-0 z-0 overflow-hidden bg-black flex items-center justify-center'>
                                {/* Right/Bottom gradient fade */}
                                <div className='absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-0 pointer-events-none' />
                                <div className='absolute inset-0 bg-gradient-to-l from-black via-transparent to-transparent z-0 pointer-events-none' />
                                {/* Clean abstract subtle glow instead of the vinyl */}
                                <div className='absolute inset-0 z-10'>
                                    <AlbumDiscSwapper />
                                </div>
                            </div>
                        }
                        className='flex-1 md:w-1/2 rounded-3xl'
                    />

                </div>

                {/* Row 2: Learns and Adapts (Full Width) */}
                <BentoCard
                    title='Learns and Adapts'
                    description='Like, save, and share your favorite sets. The AI learns your preferences to automatically craft seamlessly personalized transitions across the entire platform ecosystem.'
                    graphic={
                        <div className='absolute inset-0 z-0 overflow-hidden bg-[#050505] flex items-center justify-center'>
                            {/* Gradients moved BEHIND the animation */}
                            <div className='absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-0 pointer-events-none' />
                            <div className='absolute inset-0 bg-gradient-to-r from-black via-transparent to-black z-0 pointer-events-none' />

                            <div className='absolute inset-0 z-10'>
                                <NeuralMLNetwork />
                            </div>
                        </div>
                    }
                    className='w-full min-h-[350px] rounded-3xl'
                />

            </div>
        </div>
    );
}

// -------------------------------------------------------------
// Component: BentoCard (Structured to match screenshot layout)
// -------------------------------------------------------------
export function BentoCard({
    className = '',
    title,
    description,
    graphic,
}: {
    className?: string;
    title: React.ReactNode;
    description: React.ReactNode;
    graphic?: React.ReactNode;
}) {
    return (
        <motion.div
            initial='idle'
            whileHover='active'
            variants={{ idle: {}, active: {} }}
            className={clsx(
                className,
                'group relative flex flex-col justify-end overflow-hidden border border-white/5 bg-[#050505]',
                'transform-gpu shadow-[0_0_100px_rgba(0,0,0,0.8)] transition-all duration-700 hover:border-white/10 cursor-default'
            )}
        >
            {/* Background Graphic Slot */}
            {graphic}

            {/* Radiant colored blur gradient grounding the text */}
            <div className="absolute bottom-[-100px] left-1/2 -translate-x-1/2 w-[80%] h-[250px] bg-indigo-500/15 blur-[80px] pointer-events-none z-10 transition-opacity duration-700 group-hover:opacity-100 opacity-60 rounded-full" />
            <div className="absolute bottom-[-50px] left-1/4 w-[50%] h-[150px] bg-cyan-500/10 blur-[60px] pointer-events-none z-10" />

            {/* Text Content Area (Bottom aligned) */}
            <div className='relative p-8 md:p-10 z-20 flex flex-col justify-end h-full w-full pointer-events-none'>
                <motion.div
                    variants={{
                        idle: { y: 0 },
                        active: { y: -5 }
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="flex flex-col"
                >
                    <div className='text-3xl md:text-4xl lg:text-[40px] font-bold tracking-tight text-white mb-4 leading-none drop-shadow-lg flex flex-wrap gap-x-2 gap-y-1'>
                        {typeof title === 'string' ? title.split(' ').map((word, i) => {
                            if (word === 'Ife' || word === 'Mi') {
                                return (
                                    <span key={i} className="animate-gradient bg-gradient-to-r from-[#FF6B35] via-[#4F46E5] to-[#06B6D4] bg-[length:200%_auto] text-transparent bg-clip-text">
                                        {word}
                                    </span>
                                );
                            }
                            return <span key={i}>{word}</span>;
                        }) : title}
                    </div>
                    <div className='max-w-md drop-shadow-md'>
                        <ScrollHighlightText text={description} />
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}

// -------------------------------------------------------------
// Literal Animation 1: Endless Curation (Slot-Loading Disc Swapper)
// -------------------------------------------------------------
// -------------------------------------------------------------
// Literal Animation 1: Endless Curation (Diagonal Slide-Out Disc)
// -------------------------------------------------------------
function AlbumDiscSwapper() {
    const [activeIndex, setActiveIndex] = useState(0);
    const controls = useAnimation();

    // Explicit array of high-quality verified unsplash textures
    const albums = [
        "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1571266028243-376be88f0dd8?q=80&w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1542204165-65bf26472b9b?q=80&w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=80&w=500&auto=format&fit=crop",
        // Removed the dark/black texture that existed at the 5th index previously because it looked like a literal black untextured disc
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=500&auto=format&fit=crop"
    ];

    useEffect(() => {
        let isMounted = true;

        const sequence = async () => {
            // Give it an initial delay on mount before starting the loop
            await new Promise(r => setTimeout(r, 1000));

            while (isMounted) {
                // 1. Force the position to be perfectly zeroed and wait for the duration. The disc GUARANTEES sitting perfectly still (except for spinning).
                await controls.start({ x: 0, y: 0, filter: "blur(0px)", scale: 1, opacity: 1, transition: { duration: 0.1 } });
                await new Promise(r => setTimeout(r, 2500)); // Sleep exactly 2.5 seconds while sitting in the center

                // 2. Slide diagonally out. We fly VERY far away to ensure it is completely out of the viewport entirely.
                await controls.start({ x: 800, y: -800, filter: "blur(20px)", opacity: 0, transition: { duration: 0.7, ease: "easeIn" } });

                // 3. SECURE SWAP: Change the image exactly while it's fully hidden and faded out
                if (isMounted) {
                    setActiveIndex((prev) => (prev + 1) % albums.length);
                }

                // Sleep entirely out of frame so the user realizes the next disc is taking a second to load physically
                await new Promise(r => setTimeout(r, 300));

                // 4. Slide back from the top right. We use easeOut so it decelerates smoothly into the center.
                // It starts invisible and blurred in the top right, and swoops in exactly to the center stopping gracefully.
                await controls.set({ x: 800, y: -800, filter: "blur(20px)", opacity: 0 }); // Hard reset position instantly while hidden
                await controls.start({ x: 0, y: 0, filter: "blur(0px)", opacity: 1, transition: { duration: 0.9, ease: "easeOut" } });
            }
        };

        sequence();

        return () => { isMounted = false; };
    }, [controls, albums.length]);

    // Preload images into hidden divs so the browser guarantees instant swaps without black flashes
    // Notice `overflow-hidden` is COMPLETELY REMOVED from the parent container. This is what caused the square edge clipping previously.
    return (
        <div className="absolute top-[-50px] right-[-50px] w-[500px] h-[500px] opacity-60 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">

            {/* Hidden Preloaders to eliminate black disc flashes */}
            <div className="hidden">
                {albums.map((url, i) => <img key={i} src={url} alt="preload" />)}
            </div>

            {/* Outer Div handles translating X/Y with Controls perfectly synced with React State */}
            <motion.div
                className="absolute left-[50px] top-[50px] w-[300px] h-[300px] rounded-full"
                animate={controls}
                initial={{ x: 0, y: 0, filter: 'blur(0px)' }}
            >
                {/* Inner Div handles infinite spinning independently */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border border-white/20 shadow-[0_0_40px_rgba(0,0,0,0.8)_inset] overflow-hidden bg-black"
                    style={{ clipPath: 'circle(50% at 50% 50%)' }}
                >
                    <img
                        src={albums[activeIndex]}
                        className="absolute inset-0 w-full h-full object-cover"
                        alt="Album Artwork"
                    />
                    {/* Vinyl Center Hole */}
                    <div className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-black border border-white/20 shadow-[inset_0_5px_10px_rgba(0,0,0,1)] z-10" />
                </motion.div>
            </motion.div>
        </div>
    )
}

// -------------------------------------------------------------
// Literal Animation 2: Learns and Adapts (Premium AI Core)
// -------------------------------------------------------------
function NeuralMLNetwork() {
    const icons = [Phone, MessageCircle, Music, Heart, Calendar];
    const [iconIndex, setIconIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIconIndex((prev) => (prev + 1) % icons.length);
        }, 3000); // 3 seconds per icon
        return () => clearInterval(interval);
    }, [icons.length]);

    return (
        <div className="absolute right-[5%] md:right-0 top-0 w-full md:w-[60%] h-full flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-20 overflow-hidden">
            {/* Central Intelligence Core isolated per request */}
            <div className="relative z-10 scale-[0.6] md:scale-[0.8]">
                <SiriOrb size="200px" animationDuration={10} colors={{ c1: "#FF6B35", c2: "#4F46E5", c3: "#FF8E5E" }} />

                {/* mode="wait" guarantees the first icon unmounts completely before the next one mounts */}
                <div className="absolute inset-0 flex items-center justify-center z-30 drop-shadow-2xl">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={iconIndex}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                            className="absolute flex items-center justify-center text-white"
                        >
                            {(() => {
                                const Icon = icons[iconIndex];
                                return <Icon size={64} strokeWidth={2.5} />;
                            })()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
