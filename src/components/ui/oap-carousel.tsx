"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const oaps = [
    {
        id: 1,
        name: "Dozy",
        image: "/OAPs Images/Dozy.jpeg",
    },
    {
        id: 2,
        name: "Kika",
        image: "/OAPs Images/Kika.jpeg",
    },
    {
        id: 3,
        name: "Maka",
        image: "/OAPs Images/Maka.jpeg",
    },
    {
        id: 4,
        name: "Rotimi",
        image: "/OAPs Images/Rotimi.jpeg",
    },
    {
        id: 5,
        name: "Teni",
        image: "/OAPs Images/Teni.jpeg",
    },
    {
        id: 6,
        name: "Tosin",
        image: "/OAPs Images/Tosin.jpeg",
    },
    {
        id: 7,
        name: "Wiz",
        image: "/OAPs Images/Wiz.jpeg",
    },
];

const safeImage = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.src = "https://placehold.co/100x100/111827/FF6B35?text=OAP";
};

export default function OAPOrbitingCarousel() {
    const [activeIndex, setActiveIndex] = React.useState(0);
    const containerRadius = 200;
    const profileSize = 72;
    const containerSize = containerRadius * 2 + 120;

    const getRotation = React.useCallback(
        (index: number): number => (index - activeIndex) * (360 / oaps.length),
        [activeIndex]
    );

    const next = React.useCallback(
        () => setActiveIndex((i) => (i + 1) % oaps.length),
        []
    );

    // Auto-rotate every 2.5 seconds — infinite loop, no pause on hover
    React.useEffect(() => {
        const interval = setInterval(next, 2500);
        return () => clearInterval(interval);
    }, [next]);

    const handleProfileClick = React.useCallback(
        (index: number) => {
            if (index === activeIndex) return;
            setActiveIndex(index);
        },
        [activeIndex]
    );

    return (
        <section className="relative z-10 w-full flex flex-col items-center py-20 bg-black overflow-hidden">
            {/* Subtle glow ring */}
            <div
                className="absolute rounded-full pointer-events-none"
                style={{
                    width: containerSize + 80,
                    height: containerSize + 80,
                    background:
                        "radial-gradient(ellipse at center, rgba(255,107,53,0.08) 0%, transparent 70%)",
                }}
            />

            {/* Section Heading */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="text-center mb-16 z-10"
            >
                <p className="text-xs tracking-[0.3em] uppercase text-[#FF6B35] font-semibold mb-3">
                    Meet the Voices
                </p>
                <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                    Our On-Air Personalities
                </h2>
            </motion.div>

            {/* Orbit Container */}
            <div
                className="relative flex items-center justify-center"
                style={{ width: containerSize, height: containerSize }}
            >
                {/* Orbit ring decoration */}
                <div
                    className="absolute rounded-full border border-white/5"
                    style={{ width: containerRadius * 2, height: containerRadius * 2 }}
                />

                {/* Active Person Card (center) */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={oaps[activeIndex].id}
                        initial={{ opacity: 0, scale: 0.85, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: -16 }}
                        transition={{ type: "spring", stiffness: 300, damping: 26 }}
                        className="z-20 flex flex-col items-center text-center w-48"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-[#FF6B35] blur-xl opacity-30 scale-110" />
                            <img
                                src={oaps[activeIndex].image}
                                alt={oaps[activeIndex].name}
                                onError={safeImage}
                                className="w-28 h-28 rounded-full object-cover border-4 border-[#FF6B35] shadow-2xl relative z-10"
                            />
                        </div>
                        <motion.h3
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="mt-4 text-2xl font-bold text-white tracking-tight"
                        >
                            {oaps[activeIndex].name}
                        </motion.h3>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.18 }}
                            className="text-[#FF6B35] text-sm font-medium mt-1 tracking-wide"
                        >
                            On-Air Personality
                        </motion.p>
                    </motion.div>
                </AnimatePresence>

                {/* Orbiting profile images */}
                {oaps.map((oap, i) => {
                    const rotation = getRotation(i);
                    const isActive = i === activeIndex;

                    return (
                        <motion.div
                            key={oap.id}
                            animate={{
                                transform: `rotate(${rotation}deg) translateY(-${containerRadius}px)`,
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 140,
                                damping: 22,
                                delay: isActive ? 0 : Math.abs(i - activeIndex) * 0.04,
                            }}
                            style={{
                                width: profileSize,
                                height: profileSize,
                                position: "absolute",
                                top: `calc(50% - ${profileSize / 2}px)`,
                                left: `calc(50% - ${profileSize / 2}px)`,
                                zIndex: isActive ? 30 : 10,
                            }}
                        >
                            {/* Counter-rotate to keep image upright */}
                            <motion.div
                                animate={{ rotate: -rotation }}
                                transition={{ type: "spring", stiffness: 140, damping: 22 }}
                                className="w-full h-full"
                            >
                                <motion.img
                                    src={oap.image}
                                    alt={oap.name}
                                    onError={safeImage}
                                    onClick={() => handleProfileClick(i)}
                                    whileHover={{ scale: 1.18 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={`w-full h-full object-cover rounded-full cursor-pointer transition-all duration-300 ${isActive
                                            ? "border-[3px] border-[#FF6B35] shadow-[0_0_20px_rgba(255,107,53,0.5)]"
                                            : "border-2 border-white/20 hover:border-[#FF6B35]/60 opacity-60 hover:opacity-100"
                                        }`}
                                />
                            </motion.div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Dot progress indicators */}
            <div className="flex justify-center mt-10 gap-2">
                {oaps.map((_, idx) => (
                    <motion.button
                        key={idx}
                        onClick={() => setActiveIndex(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeIndex
                                ? "bg-[#FF6B35] w-6"
                                : "bg-white/20 w-1.5"
                            }`}
                        whileHover={{ scale: 1.3 }}
                        whileTap={{ scale: 0.9 }}
                    />
                ))}
            </div>
        </section>
    );
}
