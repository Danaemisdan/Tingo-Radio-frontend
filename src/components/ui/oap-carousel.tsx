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
                    {/* Faint orbit ring */}
                    <div
                        className="absolute rounded-full"
                        style={{
                            width: containerRadius * 2,
                            height: containerRadius * 2,
                            border: "1px solid rgba(255,107,53,0.10)",
                            boxShadow: "0 0 80px rgba(6,182,212,0.05), 0 0 40px rgba(255,107,53,0.06)",
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
                            {/* Gradient border wrapper — orange top → cyan bottom */}
                            <div
                                style={{
                                    padding: 2,
                                    borderRadius: 30,
                                    background: "linear-gradient(160deg, #FF6B35 0%, #FF8E5E 30%, #06b6d4 70%, #0ea5e9 100%)",
                                    boxShadow: "0 0 50px rgba(255,107,53,0.25), 0 0 80px rgba(6,182,212,0.15)",
                                }}
                            >
                                <div
                                    className="relative overflow-hidden"
                                    style={{ width: 280, height: 380, borderRadius: 28 }}
                                >
                                    <img
                                        src={oaps[activeIndex].image}
                                        alt={oaps[activeIndex].name}
                                        onError={safeImage}
                                        className="w-full h-full object-cover object-top"
                                        style={{ filter: "saturate(1.2) contrast(1.06)" }}
                                    />
                                    {/* Bottom gradient fade */}
                                    <div
                                        className="absolute inset-0"
                                        style={{
                                            background:
                                                "linear-gradient(to bottom, transparent 35%, rgba(0,0,0,0.92) 100%)",
                                        }}
                                    />
                                    {/* Name overlay */}
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
                                            className="text-sm font-semibold mt-1 tracking-wide uppercase"
                                            style={{ color: "#FF6B35" }}
                                        >
                                            On-Air Personality
                                        </motion.p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* ---- ORBITING THUMBNAILS — all 7 always visible ---- */}
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
                                    delay: Math.abs(i - activeIndex) * 0.04,
                                }}
                                style={{
                                    width: profileSize,
                                    height: profileSize,
                                    position: "absolute",
                                    top: `calc(50% - ${profileSize / 2}px)`,
                                    left: `calc(50% - ${profileSize / 2}px)`,
                                    zIndex: isActive ? 5 : 10,
                                    cursor: isActive ? "default" : "pointer",
                                }}
                            >
                                {/* Counter-rotate to keep image upright */}
                                <motion.div
                                    animate={{ rotate: -rotation }}
                                    transition={{ type: "spring", stiffness: 130, damping: 22 }}
                                    className="w-full h-full"
                                >
                                    {/* Gradient border wrapper for every thumbnail */}
                                    <motion.div
                                        whileHover={isActive ? {} : { scale: 1.18 }}
                                        whileTap={isActive ? {} : { scale: 0.92 }}
                                        onClick={() => !isActive && handleProfileClick(i)}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            padding: isActive ? 2 : 1.5,
                                            borderRadius: 16,
                                            background: isActive
                                                ? "linear-gradient(135deg, #FF6B35 0%, #06b6d4 100%)"
                                                : "linear-gradient(135deg, rgba(255,107,53,0.5) 0%, rgba(6,182,212,0.4) 100%)",
                                            boxShadow: isActive
                                                ? "0 0 24px rgba(255,107,53,0.4), 0 0 40px rgba(6,182,212,0.2)"
                                                : "0 2px 14px rgba(0,0,0,0.5)",
                                        }}
                                    >
                                        <div
                                            className="w-full h-full overflow-hidden relative"
                                            style={{ borderRadius: 14 }}
                                        >
                                            <img
                                                src={oap.image}
                                                alt={oap.name}
                                                onError={safeImage}
                                                className="w-full h-full object-cover object-top"
                                                style={{
                                                    filter: isActive
                                                        ? "saturate(1.1) brightness(0.85)"
                                                        : "saturate(0.8) brightness(0.65)",
                                                    transition: "filter 0.3s",
                                                }}
                                            />
                                            {/* Name label */}
                                            <div
                                                className="absolute inset-0 flex items-end justify-center pb-1"
                                                style={{
                                                    background: "linear-gradient(to bottom, transparent 45%, rgba(0,0,0,0.75) 100%)",
                                                }}
                                            >
                                                <span className="text-white text-[9px] font-semibold tracking-wide">
                                                    {oap.name}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            </motion.div>
                        );
                    })}
                </div>

            </div>
        </section>
    );
}
