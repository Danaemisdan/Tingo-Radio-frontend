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
    (e.target as HTMLImageElement).src = "https://placehold.co/400x600/0a0a0a/FF6B35?text=OAP";
};

export default function OAPOrbitingCarousel() {
    const [activeIndex, setActiveIndex] = React.useState(0);
    const RADIUS = 270;
    const THUMB = 76;

    const getAngle = React.useCallback(
        (i: number) => (i - activeIndex) * (360 / oaps.length),
        [activeIndex]
    );

    const next = React.useCallback(
        () => setActiveIndex((i) => (i + 1) % oaps.length), []
    );

    React.useEffect(() => {
        const t = setInterval(next, 3200);
        return () => clearInterval(t);
    }, [next]);

    const total = RADIUS * 2 + THUMB * 2 + 40;

    return (
        <section
            className="relative w-full overflow-hidden"
            style={{
                /* Rich deep gradient — not just black */
                background:
                    "radial-gradient(ellipse 100% 90% at 50% 50%, #1a0a00 0%, #0d0500 40%, #000000 100%)",
                paddingTop: "6rem",
                paddingBottom: "5rem",
            }}
        >
            {/* ── Ambient glow layers ── */}
            <div className="pointer-events-none absolute inset-0 z-0">
                {/* Large warm centre bloom */}
                <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{
                        width: 900,
                        height: 900,
                        borderRadius: "50%",
                        background:
                            "radial-gradient(ellipse, rgba(255,107,53,0.14) 0%, transparent 70%)",
                    }}
                />
                {/* Cool blue left edge */}
                <div
                    className="absolute -left-40 top-0 h-full"
                    style={{
                        width: 600,
                        background:
                            "radial-gradient(ellipse 80% 80% at 0% 50%, rgba(6,182,212,0.09) 0%, transparent 70%)",
                    }}
                />
                {/* Cool blue right edge */}
                <div
                    className="absolute -right-40 top-0 h-full"
                    style={{
                        width: 600,
                        background:
                            "radial-gradient(ellipse 80% 80% at 100% 50%, rgba(14,165,233,0.08) 0%, transparent 70%)",
                    }}
                />
                {/* Top-to-bottom black fade */}
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            "linear-gradient(to bottom, #000 0%, transparent 15%, transparent 85%, #000 100%)",
                    }}
                />
            </div>

            <div className="relative z-10 flex flex-col items-center">
                {/* ── Section heading ── */}
                <motion.div
                    initial={{ opacity: 0, y: 28 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    className="mb-16 text-center"
                >
                    {/* Eyebrow with flanking lines */}
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div
                            className="h-px w-16"
                            style={{ background: "linear-gradient(to right, transparent, #FF6B35)" }}
                        />
                        <span
                            className="text-[10px] tracking-[0.4em] uppercase font-semibold"
                            style={{ color: "#FF6B35" }}
                        >
                            Meet the Voices
                        </span>
                        <div
                            className="h-px w-16"
                            style={{ background: "linear-gradient(to left, transparent, #06b6d4)" }}
                        />
                    </div>
                    <h2
                        className="text-5xl md:text-6xl font-black tracking-tighter"
                        style={{
                            background: "linear-gradient(135deg, #ffffff 30%, rgba(255,255,255,0.55) 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}
                    >
                        Our On-Air Personalities
                    </h2>
                </motion.div>

                {/* ── Orbit + centre card ── */}
                <div
                    className="relative flex items-center justify-center"
                    style={{ width: total, height: total }}
                >
                    {/* Subtle orbit ring */}
                    <div
                        className="pointer-events-none absolute rounded-full"
                        style={{
                            width: RADIUS * 2,
                            height: RADIUS * 2,
                            border: "1px solid rgba(255,107,53,0.08)",
                            boxShadow:
                                "0 0 0 1px rgba(6,182,212,0.06), 0 0 100px rgba(255,107,53,0.07) inset",
                        }}
                    />

                    {/* ── Centre portrait card ── */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={oaps[activeIndex].id}
                            initial={{ opacity: 0, scale: 0.86, y: 18 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.86, y: -18 }}
                            transition={{ type: "spring", stiffness: 300, damping: 28 }}
                            style={{ zIndex: 20 }}
                        >
                            {/* Gradient border wrapper */}
                            <div
                                style={{
                                    padding: 2.5,
                                    borderRadius: 32,
                                    background:
                                        "linear-gradient(160deg, #FF6B35 0%, #ffb347 25%, #06b6d4 65%, #0ea5e9 100%)",
                                    boxShadow:
                                        "0 0 60px rgba(255,107,53,0.3), 0 0 120px rgba(6,182,212,0.15), 0 30px 80px rgba(0,0,0,0.7)",
                                }}
                            >
                                <div
                                    className="relative overflow-hidden"
                                    style={{ width: 280, height: 390, borderRadius: 30 }}
                                >
                                    <img
                                        src={oaps[activeIndex].image}
                                        alt={oaps[activeIndex].name}
                                        onError={safeImage}
                                        className="w-full h-full object-cover object-top"
                                        style={{ filter: "saturate(1.25) contrast(1.08)" }}
                                    />

                                    {/* Cinematic gradient over image */}
                                    <div
                                        className="absolute inset-0"
                                        style={{
                                            background:
                                                "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, transparent 30%, rgba(0,0,0,0.95) 100%)",
                                        }}
                                    />

                                    {/* Live badge */}
                                    <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full px-3 py-1"
                                        style={{
                                            background: "rgba(0,0,0,0.55)",
                                            backdropFilter: "blur(8px)",
                                            border: "1px solid rgba(255,107,53,0.4)",
                                        }}
                                    >
                                        <motion.span
                                            animate={{ opacity: [1, 0.2, 1] }}
                                            transition={{ duration: 1.4, repeat: Infinity }}
                                            className="block h-1.5 w-1.5 rounded-full bg-[#FF6B35]"
                                        />
                                        <span className="text-[10px] font-semibold tracking-widest text-white uppercase">
                                            On Air
                                        </span>
                                    </div>

                                    {/* Name area */}
                                    <div className="absolute bottom-0 left-0 right-0 p-6">
                                        {/* Thin accent line */}
                                        <div
                                            className="mb-3 h-px w-10"
                                            style={{
                                                background:
                                                    "linear-gradient(to right, #FF6B35, #06b6d4)",
                                            }}
                                        />
                                        <motion.h3
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 }}
                                            className="text-4xl font-black text-white tracking-tight leading-none"
                                        >
                                            {oaps[activeIndex].name}
                                        </motion.h3>
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.18 }}
                                            className="mt-1 text-xs font-semibold tracking-[0.2em] uppercase"
                                            style={{ color: "#06b6d4" }}
                                        >
                                            Tingo AI Radio
                                        </motion.p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* ── Orbiting circles ── */}
                    {oaps.map((oap, i) => {
                        const angle = getAngle(i);
                        const isActive = i === activeIndex;

                        return (
                            <motion.div
                                key={oap.id}
                                animate={{
                                    transform: `rotate(${angle}deg) translateY(-${RADIUS}px)`,
                                }}
                                transition={{
                                    type: "spring",
                                    stiffness: 130,
                                    damping: 22,
                                    delay: Math.abs(i - activeIndex) * 0.04,
                                }}
                                style={{
                                    width: THUMB,
                                    height: THUMB,
                                    position: "absolute",
                                    top: `calc(50% - ${THUMB / 2}px)`,
                                    left: `calc(50% - ${THUMB / 2}px)`,
                                    zIndex: isActive ? 5 : 10,
                                }}
                            >
                                {/* Counter-rotate to stay upright */}
                                <motion.div
                                    animate={{ rotate: -angle }}
                                    transition={{ type: "spring", stiffness: 130, damping: 22 }}
                                    style={{ width: "100%", height: "100%" }}
                                >
                                    <motion.div
                                        onClick={() => !isActive && setActiveIndex(i)}
                                        whileHover={isActive ? {} : { scale: 1.2 }}
                                        whileTap={isActive ? {} : { scale: 0.9 }}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            padding: isActive ? 2.5 : 2,
                                            borderRadius: "50%",
                                            background: isActive
                                                ? "linear-gradient(135deg, #FF6B35 0%, #06b6d4 100%)"
                                                : "linear-gradient(135deg, rgba(255,107,53,0.35) 0%, rgba(6,182,212,0.3) 100%)",
                                            boxShadow: isActive
                                                ? "0 0 22px rgba(255,107,53,0.5), 0 0 40px rgba(6,182,212,0.2)"
                                                : "0 4px 16px rgba(0,0,0,0.6)",
                                            cursor: isActive ? "default" : "pointer",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                borderRadius: "50%",
                                                overflow: "hidden",
                                                position: "relative",
                                            }}
                                        >
                                            <img
                                                src={oap.image}
                                                alt={oap.name}
                                                onError={safeImage}
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "cover",
                                                    objectPosition: "top",
                                                    filter: isActive
                                                        ? "saturate(1.1) brightness(0.9)"
                                                        : "saturate(0.7) brightness(0.55)",
                                                    transition: "filter 0.4s",
                                                }}
                                            />
                                            {/* Name chip below image */}
                                        </div>
                                    </motion.div>

                                    {/* Name below circle */}
                                    <div className="mt-1.5 text-center">
                                        <span
                                            className="text-[10px] font-semibold tracking-wide"
                                            style={{
                                                color: isActive ? "#FF6B35" : "rgba(255,255,255,0.45)",
                                                transition: "color 0.3s",
                                            }}
                                        >
                                            {oap.name}
                                        </span>
                                    </div>
                                </motion.div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
