"use client";
import * as React from "react";
import {
    motion,
    useMotionTemplate,
    useScroll,
    useTransform,
} from "framer-motion";
import Image from "next/image";

export interface SmoothScrollHeroProps {
    /**
     * Height of the scroll section in pixels
     * @default 1500
     */
    scrollHeight?: number;
    /**
     * Background image URL for desktop view
     */
    desktopImage?: string;
    /**
     * Background image URL for mobile view
     */
    mobileImage?: string;
    /**
     * Initial clip path percentage
     * @default 25
     */
    initialClipPercentage?: number;
    /**
     * Final clip path percentage
     * @default 75
     */
    finalClipPercentage?: number;
}

const SmoothScrollHero: React.FC<SmoothScrollHeroProps> = ({
    scrollHeight = 1500,
    desktopImage = "https://images.unsplash.com/photo-1511884642898-4c92249e20b6",
    mobileImage = "https://images.unsplash.com/photo-1511207538754-e8555f2bc187?q=80&w=2412&auto=format&fit=crop",
    initialClipPercentage = 25,
    finalClipPercentage = 75,
}) => {
    const { scrollYProgress } = useScroll();

    const clipStart = useTransform(
        scrollYProgress,
        [0, 1],
        [initialClipPercentage, 0]
    );
    const clipEnd = useTransform(
        scrollYProgress,
        [0, 1],
        [finalClipPercentage, 100]
    );

    const clipPath = useMotionTemplate`polygon(${clipStart}% ${clipStart}%, ${clipEnd}% ${clipStart}%, ${clipEnd}% ${clipEnd}%, ${clipStart}% ${clipEnd}%)`;

    const backgroundSize = useTransform(
        scrollYProgress,
        [0, 1 + (500 / scrollHeight)],
        ["170%", "100%"]
    );

    // Fade in the Tingo Logo towards the end of the global scroll
    const logoOpacity = useTransform(scrollYProgress, [0.75, 0.95], [0, 1]);

    return (
        <div
            style={{ height: `calc(${scrollHeight}px + 100vh)` }}
            className="w-full"
        >
            <motion.div
                className="sticky top-0 h-screen w-full bg-black flex items-center justify-center overflow-hidden"
                style={{
                    clipPath,
                    willChange: "transform, opacity, clip-path",
                }}
            >
                {/* Decorative Darker Overlay for Text Contrast */}
                <div className="absolute inset-0 bg-black/60 z-10" />

                {/* Mobile background */}
                <motion.div
                    className="absolute inset-0 md:hidden z-0"
                    style={{
                        backgroundImage: `url(${mobileImage})`,
                        backgroundSize,
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                    }}
                />
                {/* Desktop background */}
                <motion.div
                    className="absolute inset-0 hidden md:block z-0"
                    style={{
                        backgroundImage: `url(${desktopImage})`,
                        backgroundSize,
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                    }}
                />

                {/* Rule of Thirds Fading Logo */}
                <motion.div
                    style={{ opacity: logoOpacity }}
                    className="relative z-20 flex flex-col items-center justify-center pointer-events-none"
                >
                    <Image
                        src="/tingo_logo_minimal.svg"
                        alt="Tingo Logo"
                        width={800}
                        height={200}
                        className="w-[70vw] md:w-[50vw] max-w-[600px] drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]"
                        priority
                    />
                </motion.div>
            </motion.div>
        </div>
    );
};

export default SmoothScrollHero;
