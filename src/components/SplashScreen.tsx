"use client"

import { motion } from "framer-motion"

export default function SplashScreen() {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
            {/* The black background that fades out slowly to reveal the landing page */}
            <motion.div
                className="absolute inset-0 bg-black"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
            />

            {/* The logo container which explicitly DOES NOT FADE OUT ON EXIT */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.0, ease: "easeOut" }}
                className="relative z-50 pointer-events-auto"
            >
                <motion.img
                    layoutId="tingo-logo"
                    src="/NewLogo.svg"
                    alt="Tingo Logo"
                    className="w-48 md:w-72 drop-shadow-2xl"
                    transition={{ layout: { duration: 1.5, ease: [0.16, 1, 0.3, 1] } }}
                />
            </motion.div>
        </div>
    )
}
