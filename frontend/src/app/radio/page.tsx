"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import HeroWave from '@/components/ui/dynamic-wave-canvas-background';
import { Heart, Share2, ListPlus } from 'lucide-react';
import { MicroExpander } from '@/components/ui/micro-expander';
import { MusicToggleButton } from '@/components/ui/music-toggle-btn';
import { AnimatePresence, motion } from 'framer-motion';
import { MinimalVolumeBar } from '@/components/ui/minimal-volume-bar';
import { LiveChat, FloatingEmojiOverlay, SuperChatOverlay, FloatingEmoji } from '@/components/ui/live-chat';
import { SplashHero } from '@/components/ui/music-reactive-hero-section';
import { LiveRadioPlayer } from '@/components/ui/live-radio-player';
import { SavedTracksView } from '@/components/ui/saved-tracks';
import { MusicLibraryView } from '@/components/ui/music-library';
import { SessionsView } from '@/components/ui/sessions-view';
import { Show, SignIn, UserButton } from '@clerk/nextjs';

type Tab = 'radio' | 'archive' | 'sounds' | 'collection';

interface ChatMessage {
  user: string;
  message: string;
  ts: number;
  type?: "normal" | "reaction" | "superchat";
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'radio',      label: 'Live' },
  { id: 'archive',    label: 'The Archive' },
  { id: 'sounds',     label: 'Tingo Sounds' },
  { id: 'collection', label: 'My Collection' },
];

const LANGUAGES = [
  { code: 'en', label: 'English',   flag: '🇬🇧' },
  { code: 'fr', label: 'Français',  flag: '🇫🇷' },
  { code: 'es', label: 'Español',   flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch',   flag: '🇩🇪' },
  { code: 'yo', label: 'Yorùbá',    flag: '🇳🇬' },
  { code: 'ha', label: 'Hausa',     flag: '🇳🇬' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'ar', label: 'العربية',   flag: '🇸🇦' },
  { code: 'zh', label: '中文',       flag: '🇨🇳' },
  { code: 'hi', label: 'हिन्दी',     flag: '🇮🇳' },
];

export default function RadioPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [superChats, setSuperChats] = useState<ChatMessage[]>([]);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [hasTunedIn, setHasTunedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('radio');
  const [language, setLanguage] = useState('en');
  const [langOpen, setLangOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  useEffect(() => {
    setIsMobile(navigator.maxTouchPoints > 0 || window.innerWidth < 768);
  }, []);

  const handleFloatingEmoji = useCallback((fe: FloatingEmoji) => {
    setFloatingEmojis(prev => [...prev, fe]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== fe.id));
    }, 2500);
  }, []);

  return (
    <main className="relative min-h-screen min-h-dvh w-full bg-black text-white overflow-hidden selection:bg-white/30">

      {/* ── Top Navigation ── */}
      <AnimatePresence>
        {hasTunedIn && (
          <motion.nav
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={[
              "fixed top-0 inset-x-0 z-[60] h-[calc(4rem+env(safe-area-inset-top))] sm:h-[calc(5rem+env(safe-area-inset-top))] flex items-center pt-[env(safe-area-inset-top)] px-3 sm:px-6 gap-2 sm:gap-4 transition-[padding] duration-500",
              // Shift nav content left when the chat sidebar is visible on desktop
              isPlaying && activeTab === 'radio' ? "md:pr-[344px]" : "",
            ].join(" ")}
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, transparent 100%)' }}
          >
            {/* Logo — left (fixed width so center stays true on desktop) */}
            <div className="shrink-0 w-8 sm:w-32 flex items-center">
              <motion.img layoutId="tingo-logo" src="/tingo_logo_minimal.svg" alt="Tingo" className="block cursor-pointer w-auto h-6 sm:h-12" />
            </div>

            {/* Tabs — true center via flex-1 + justify-center */}
            <div className="flex-1 flex justify-center pointer-events-auto overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              <div className="flex items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-full p-1 gap-0.5 sm:gap-1">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                      activeTab === tab.id ? 'text-white' : 'text-white/45 hover:text-white/80'
                    }`}
                  >
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="tab-pill"
                        className="absolute inset-0 bg-white/15 rounded-full"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Language & User Controls — right */}
            <div className="shrink-0 w-auto sm:w-48 flex justify-end items-center gap-3 pointer-events-auto">
              <div className="relative">
                <button
                  onClick={() => setLangOpen(o => !o)}
                  className="flex items-center gap-1 sm:gap-2 bg-white/5 border border-white/10 rounded-full px-2 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-sm font-medium text-white/90 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
                >
                  <span className="text-sm sm:text-base">{currentLang.flag}</span>
                  <span className="hidden sm:inline">{currentLang.label}</span>
                  <motion.svg
                    animate={{ rotate: langOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className="opacity-50 hidden sm:block"
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </motion.svg>
                </button>

                <AnimatePresence>
                  {langOpen && (
                    <>
                      <div className="fixed inset-0 z-[49]" onClick={() => setLangOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="absolute top-full right-0 mt-2 z-[50] min-w-[180px] rounded-2xl overflow-hidden"
                        style={{
                          background: 'rgba(12,12,18,0.97)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          backdropFilter: 'blur(30px)',
                          WebkitBackdropFilter: 'blur(30px)',
                          boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
                        }}
                      >
                        {LANGUAGES.map((lang, i) => (
                          <motion.button
                            key={lang.code}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all text-left ${
                              lang.code === language
                                ? 'text-white font-semibold bg-white/5'
                                : 'text-white/55 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <span className="text-base">{lang.flag}</span>
                            <span className="flex-1">{lang.label}</span>
                            {lang.code === language && (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </motion.button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              
              <Show when="signed-in">
                <div className="hidden sm:flex bg-white/5 border border-white/10 rounded-full items-center justify-center p-0.5">
                  <UserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8" } }} />
                </div>
              </Show>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Fade-in from black */}
      <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1.0 }}
        className="fixed inset-0 z-[9999] bg-black pointer-events-none" />

      {/* Splash Screen */}
      <AnimatePresence>
        {!hasTunedIn && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 z-[100]"
          >
            <SplashHero onTuneIn={() => setHasTunedIn(true)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wave background (Disabled on mobile to prevent Android WebGL crash) */}
      {!isMobile && (
        <div className="absolute inset-0 z-0 opacity-80 pointer-events-none">
          <HeroWave />
        </div>
      )}

      {/* Aurora when playing (Disabled on mobile to prevent OOM blur crashes) */}
      <AnimatePresence>
        {isPlaying && !isMobile && (
          <motion.div key="aurora" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 2 }} className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            <motion.div
              className="absolute top-[20%] left-[10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-[#FF6B35] blur-[80px] sm:blur-[100px] rounded-full opacity-20 transform-gpu"
              animate={{ scale: [1, 1.2, 1], x: ['0%', '10%', '0%'], y: ['0%', '-10%', '0%'] }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} />
            <motion.div
              className="absolute bottom-[10%] right-[10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-[#22d3ee] blur-[80px] sm:blur-[100px] rounded-full opacity-15 transform-gpu"
              animate={{ scale: [1, 1.3, 1], x: ['0%', '-15%', '0%'], y: ['0%', '10%', '0%'] }}
              transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} />
          </motion.div>
        )}
      </AnimatePresence>

      <Show when="signed-out">
        {hasTunedIn && (
          <div className="absolute inset-0 z-[80] flex items-center justify-center pt-16 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <SignIn routing="hash" forceRedirectUrl="/radio" signUpForceRedirectUrl="/radio" appearance={{ elements: { formButtonPrimary: "bg-[#FF6B35] hover:bg-[#ff8052]" } }} />
            </motion.div>
          </div>
        )}
      </Show>

      <Show when="signed-in">
        {/* Floating Emoji Overlay */}
        <FloatingEmojiOverlay emojis={floatingEmojis} />

        {/* Super Chat Banner */}
        <SuperChatOverlay messages={superChats} />

        {/* Floating Mobile User Button */}
        <div className="fixed bottom-[100px] right-4 sm:hidden z-[65] pointer-events-auto">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-full flex items-center justify-center p-1.5 hover:scale-105 transition-transform active:scale-95">
            <UserButton appearance={{ elements: { userButtonAvatarBox: "w-10 h-10" } }} />
          </div>
        </div>

        {/* ── Main Content Area ── */}
        <div
          className={[
            "absolute inset-0 z-30 pt-20",
            isPlaying && activeTab === 'radio' ? "md:pr-[320px]" : "",
            "transition-all duration-500",
          ].join(" ")}
        >
          {/* PERSISTENT RADIO VIEW - Never unmounted so audio doesn't stop */}
          <div
            className={`flex flex-col items-center justify-end min-h-full pb-[max(32px,env(safe-area-inset-bottom,0px))] overflow-y-auto transition-opacity duration-300 ${
              activeTab === 'radio' ? 'flex opacity-100 pointer-events-auto z-10' : 'hidden opacity-0 pointer-events-none z-[-1]'
            }`}
          >
            <LiveRadioPlayer isPlaying={isPlaying} setIsPlaying={setIsPlaying} language={language} onChatToggle={() => setIsMobileChatOpen(p => !p)} />
          </div>

        <AnimatePresence mode="wait">
          {activeTab === 'archive' && (
            <motion.div key="archive-view" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="min-h-full overflow-y-auto">
              <SessionsView />
            </motion.div>
          )}

          {activeTab === 'sounds' && (
            <motion.div key="sounds-view" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="min-h-full overflow-y-auto">
              <MusicLibraryView />
            </motion.div>
          )}

          {activeTab === 'collection' && (
            <motion.div key="collection-view" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="min-h-full overflow-y-auto">
              <SavedTracksView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Live Chat Sidebar (Desktop) ── */}
      <AnimatePresence>
        {isPlaying && activeTab === 'radio' && (
          <motion.aside key="chat-desktop"
            initial={{ x: 320, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 320, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="hidden md:flex fixed top-0 right-0 h-full w-80 z-40 flex-col"
            style={{
              background: "linear-gradient(180deg, rgba(28,22,18,0.97) 0%, rgba(18,14,12,0.98) 100%)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderLeft: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <LiveChat visible={true} isLive={isPlaying} onFloatingEmoji={handleFloatingEmoji} onClose={() => {}} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Live Chat Bottom Sheet (Mobile) ── */}
      <AnimatePresence>
        {isPlaying && isMobileChatOpen && (
          <motion.aside key="chat-mobile"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="md:hidden fixed inset-x-0 bottom-0 top-16 z-[70] flex flex-col rounded-t-3xl overflow-hidden"
            style={{
              background: "linear-gradient(180deg, rgba(12,12,18,1) 0%, rgba(5,5,10,1) 100%)",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 -10px 40px rgba(0,0,0,0.6)",
            }}
          >
            <div className="w-full flex justify-center py-3 shrink-0 cursor-pointer active:opacity-70"
              onClick={() => setIsMobileChatOpen(false)}>
              <div className="w-12 h-1 bg-white/20 rounded-full" />
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <LiveChat visible={true} isLive={isPlaying} onFloatingEmoji={handleFloatingEmoji}
                onClose={() => setIsMobileChatOpen(false)} isMobile={true} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      </Show>

    </main>
  );
}
