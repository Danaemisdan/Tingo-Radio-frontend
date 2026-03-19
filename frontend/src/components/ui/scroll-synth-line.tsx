"use client";

import React, { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";

export const SvgSynthLine = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"],
    });

    const pathLength = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001,
    });

    // We'll track the vertical position of the line drawing head.
    // Since the SVG viewBox is 0 0 1000 3000, 100% of the pathLength roughly correlates to the bottom height.
    const barTopPosition = useTransform(pathLength, [0, 1], ["0%", "100%"]);

    // Animate the X position of the bar to roughly follow the curve of the SVG path manually,
    // so the bar stays clamped somewhat near the line as it wanders.
    // The path roughly goes: center (500) -> right (800) -> left (200) -> right (800) -> center (500)
    const barLeftPosition = useTransform(
        pathLength,
        [0, 0.25, 0.5, 0.75, 1],
        ["50%", "80%", "20%", "80%", "50%"]
    );

    return (
        <div
            ref={containerRef}
            className="absolute top-0 bottom-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden"
        >
            <svg
                viewBox="0 0 1000 3000"
                preserveAspectRatio="none"
                className="w-full h-full absolute top-0 left-0"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Background Track (Faded, flat) */}
                <path
                    d="M 500,0 C 500,300 800,400 800,750 C 800,1100 200,1300 200,1500 C 200,1700 800,2000 800,2250 C 800,2500 500,2700 500,3000"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white/5"
                />

                {/* Animated Synth Line (Brand Gradient, FLAT no glow) */}
                <motion.path
                    d="M 500,0 C 500,300 800,400 800,750 C 800,1100 200,1300 200,1500 C 200,1700 800,2000 800,2250 C 800,2500 500,2700 500,3000"
                    stroke="url(#synthGradient)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ pathLength }}
                />

                {/* Definition for Brand Gradient */}
                <defs>
                    <linearGradient
                        id="synthGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="100%"
                        gradientUnits="userSpaceOnUse"
                    >
                        <stop stopColor="#22d3ee" />
                        <stop offset="0.5" stopColor="#FF6B35" />
                        <stop offset="1" stopColor="#FF8E5E" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Flat Bar Tracker (No orb, no glow) */}
            <motion.div
                style={{
                    top: barTopPosition,
                    left: barLeftPosition,
                    translateX: "-50%",
                    translateY: "-50%"
                }}
                className="absolute w-[40px] h-[4px] bg-white z-10 rounded-full"
            />
        </div>
    );
};
