"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LandingPage from '@/components/LandingPage';
import SplashScreen from "@/components/SplashScreen";
import { useRouter } from "next/navigation";

export default function Home() {
  const [appState, setAppState] = useState<'splash' | 'landing'>('splash');
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppState('landing');
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="relative min-h-screen w-full bg-black text-white font-sans selection:bg-white/30">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] transition-opacity duration-[3000ms] opacity-10" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-white/5 rounded-full blur-[150px] transition-opacity duration-[3000ms] opacity-5" />
      </div>

      <AnimatePresence>
        {appState === 'splash' && <SplashScreen key="splash" />}

        {appState === 'landing' && (
          <motion.div key="landing" className="relative z-10 w-full h-full min-h-screen">
            <LandingPage onEnterRadio={() => router.push('/radio')} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
