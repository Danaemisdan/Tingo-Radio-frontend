import { motion } from 'framer-motion';
import { useEffect } from 'react';

export const SplashHero = ({ onTuneIn }: { onTuneIn: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onTuneIn();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onTuneIn]);

  return (
    <div className="relative w-full h-full min-h-screen bg-[#050505] overflow-hidden flex flex-col items-center justify-center font-sans">
      <motion.img 
        layoutId="tingo-logo"
        src="/tingo_logo_minimal.svg" 
        alt="Tingo AI Radio" 
        className="h-32 md:h-48 lg:h-56 w-auto mx-auto drop-shadow-[0_0_20px_rgba(255,107,53,0.3)]" 
      />
    </div>
  );
};