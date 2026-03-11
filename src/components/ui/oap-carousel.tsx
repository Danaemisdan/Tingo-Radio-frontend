"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const oaps = [
    { id: 1, name: "Dozy", image: "/OAPs Images/Dozy.jpeg" },
    { id: 2, name: "Kika", image: "/OAPs Images/Kika.jpeg" },
    { id: 3, name: "Maka", image: "/OAPs Images/Maka.jpeg" },
    { id: 4, name: "Rotimi", image: "/OAPs Images/Rotimi.jpeg" },
    { id: 5, name: "Teni", image: "/OAPs Images/Teni.jpeg" },
    { id: 6, name: "Tosin", image: "/OAPs Images/Tosin.jpeg" },
    { id: 7, name: "Wiz", image: "/OAPs Images/Wiz.jpeg" },
];

const safeImage = (e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).src =
        "https://placehold.co/400x600/111827/FF6B35?text=OAP";
};

export default function OAPOrbitingCarousel() {
    const [activeIndex, setActiveIndex] = React.useState(0);
    const containerRadius = 260;
    const profileSize = 80;
    const containerSize = containerRadius * 2 + 160;

    const getRotation = React.useCallback(
        (index: number): number =>
            (index - activeIndex) * (360 / oaps.length),
        [activeIndex]
    );

    const next = React.useCallback(
        () => setActiveIndex((i) => (i + 1) % oaps.length),
        []
    );

    React.useEffect(() => {
        const interval = setInterval(next, 3000);
        return () => clearInterval(interval);
    }, [next]);

    const handleProfileClick = React.useCallback(
        (index: number) => setActiveIndex(index),
        []
    );

    return (
        <section className="relative z-10 w-full overflow-hidden" style={{ background: "black" }}>
            {/* Full-bleed gradient background */}
            <div className="absolute inset-0 z-0">
                {/* Radial orange glow from center */}
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,107,53,0.18) 0%, rgba(255,107,53,0.06) 40%, transparent 75%)",
                    }}
                />
                {/* Left deep teal bleed */}
                <div
                    className="absolute -left-32 top-0 bottom-0 w-1/2"
                    style={{
                        background:
                            "radial-gradient(ellipse 80% 80% at 0% 50%, rgba(6,182,212,0.12) 0%, transparent 70%)",
                    }}
                />
                {/* Right warm amber */}
                <div
                    className="absolute -right-32 top-0 bottom-0 w-1/2"
                    style={{
                        background:
                            "radial-gradient(ellipse 80% 80% at 100% 50%, rgba(251,146,60,0.10) 0%, transparent 70%)",
                    }}
                />
                {/* Subtle top-to-bottom gradient */}
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.8) 100%)",
                    }}
                />
            </div>

            <div className="relative z-10 flex flex-col items-center py-24">
                {/* Heading */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9 }}
                    className="text-center mb-20"
                >
                    <p className="text-xs tracking-[0.35em] uppercase text-[#FF6B35] font-semibold mb-3">
                        Meet the Voices
                    </p>
                    <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter">
                        Our On-Air&nbsp;Personalities
                    </h2>
                </motion.div>

                {/* ---- ORBIT LAYOUT ---- */}
                <div
                    className="relative flex items-center justify-center"
                    style={{ width: containerSize, height: containerSize }}
                >
                    {/* Faint ring */}
                    <div
                        className="absolute rounded-full"
                        style={{
                            width: containerRadius * 2,
                            height: containerRadius * 2,
                            border: "1px solid rgba(255,107,53,0.12)",
                            boxShadow: "0 0 60px rgba(255,107,53,0.06)",
                        }}
                    />

                    {/* ---- CENTER ACTIVE CARD ---- */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={oaps[activeIndex].id}
                            initial={{ opacity: 0, scale: 0.88, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.88, y: -20 }}
                            transition={{ type: "spring", stiffness: 280, damping: 26 }}
                            className="z-20 flex flex-col items-center"
                            style={{ width: 320 }}
                        >
                            {/* Portrait — no circle, just a tall card with gradient fade */}
                            <div
                                className="relative overflow-hidden"
                                style={{
                                    width: 280,
                                    height: 380,
                                    borderRadius: 28,
                                }}
                            >
                                <img
                                    src={oaps[activeIndex].image}
                                    alt={oaps[activeIndex].name}
                                    onError={safeImage}
                                    className="w-full h-full object-cover object-top"
                                    style={{ filter: "saturate(1.15) contrast(1.05)" }}
                                />
                                {/* Bottom fade to black */}
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        background:
                                            "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.85) 100%)",
                                    }}
                                />
                                {/* Orange glow ring along border */}
                                <div
                                    className="absolute inset-0 rounded-[28px] pointer-events-none"
                                    style={{
                                        boxShadow:
                                            "inset 0 0 0 2px rgba(255,107,53,0.5), 0 0 60px rgba(255,107,53,0.3)",
                                    }}
                                />
                                {/* Name overlay at bottom */}
                                <div className="absolute bottom-0 left-0 right-0 p-6">
                                    <motion.h3
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.12 }}
                                        className="text-3xl font-black text-white tracking-tight leading-none"
                                    >
                                        {oaps[activeIndex].name}
                                    </motion.h3>
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="text-[#FF6B35] text-sm font-semibold mt-1 tracking-wide uppercase"
                                    >
                                        On-Air Personality
                                    </motion.p>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* ---- ORBITING THUMBNAILS ---- */}
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
                                    stiffness: 130,
                                    damping: 22,
                                    delay: isActive ? 0 : Math.abs(i - activeIndex) * 0.04,
                                }}
                                style={{
                                    width: profileSize,
                                    height: profileSize,
                                    position: "absolute",
                                    top: `calc(50% - ${profileSize / 2}px)`,
                                    left: `calc(50% - ${profileSize / 2}px)`,
                                    zIndex: isActive ? 5 : 10,
                                    pointerEvents: isActive ? "none" : "auto",
                                }}
                            >
                                {/* Counter-rotate to keep image upright */}
                                <motion.div
                                    animate={{ rotate: -rotation }}
                                    transition={{ type: "spring", stiffness: 130, damping: 22 }}
                                    className="w-full h-full"
                                >
                                    <motion.div
                                        onClick={() => handleProfileClick(i)}
                                        whileHover={{ scale: 1.2 }}
                                        whileTap={{ scale: 0.92 }}
                                        className="w-full h-full cursor-pointer overflow-hidden"
                                        style={{
                                            borderRadius: 16,
                                            border: isActive
                                                ? "2.5px solid rgba(255,107,53,0.8)"
                                                : "2px solid rgba(255,255,255,0.12)",
                                            boxShadow: isActive
                                                ? "0 0 20px rgba(255,107,53,0.45)"
                                                : "0 2px 12px rgba(0,0,0,0.5)",
                                            opacity: isActive ? 0 : 1,
                                            transition: "opacity 0.3s",
                                        }}
                                    >
                                        <img
                                            src={oap.image}
                                            alt={oap.name}
                                            onError={safeImage}
                                            className="w-full h-full object-cover object-top"
                                            style={{ filter: "saturate(0.85) brightness(0.75)" }}
                                        />
                                        {/* Name tooltip shown on hover via CSS trick */}
                                        <div
                                            className="absolute inset-0 flex items-end justify-center pb-1"
                                            style={{
                                                background:
                                                    "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.7) 100%)",
                                            }}
                                        >
                                            <span className="text-white text-[9px] font-semibold tracking-wide opacity-80">
                                                {oap.name}
                                            </span>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Dot indicators */}
                <div className="flex justify-center mt-12 gap-2">
                    {oaps.map((_, idx) => (
                        <motion.button
                            key={idx}
                            onClick={() => setActiveIndex(idx)}
                            className="h-1.5 rounded-full transition-all duration-300"
                            style={{
                                width: idx === activeIndex ? 28 : 6,
                                background:
                                    idx === activeIndex
                                        ? "#FF6B35"
                                        : "rgba(255,255,255,0.2)",
                            }}
                            whileHover={{ scale: 1.3 }}
                            whileTap={{ scale: 0.9 }}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
