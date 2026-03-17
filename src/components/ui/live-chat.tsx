"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Phone, PhoneOff, Zap } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  user: string;
  message: string;
  ts: number;
  type?: "normal" | "reaction" | "superchat";
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const USER_COLORS = [
  "#FF6B6B","#FFA94D","#FFD43B","#69DB7C",
  "#4DABF7","#DA77F2","#FF8FAB","#63E6BE",
  "#74C0FC","#F783AC","#A9E34B","#66D9E8",
];
function getUserColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}
function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}
const AI_NAMES = new Set(["Tingo AI Radio 🤖","Ife (AI Host) 🎙️","Tingo (AI Host) 🎙️"]);

// ── Reaction Emojis ───────────────────────────────────────────────────────────
const REACTIONS = [
  { emoji: "🔥", label: "Fire" },
  { emoji: "❤️", label: "Love" },
  { emoji: "💯", label: "100" },
  { emoji: "😂", label: "LOL" },
  { emoji: "😤", label: "Hype" },
  { emoji: "🎶", label: "Music" },
];

// ── Floating emoji (rendered at root level of radio page via callback) ────────
export interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number; // percent of screen width
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface LiveChatProps {
  visible: boolean;
  isLive: boolean;
  onFloatingEmoji?: (fe: FloatingEmoji) => void;
  onClose?: () => void;
  isMobile?: boolean;
}

// ── Username Picker ───────────────────────────────────────────────────────────
function NamePicker({ onDone }: { onDone: (name: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex flex-col justify-center items-center h-full gap-5 px-5">
      <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
        <span className="text-2xl">🎙️</span>
      </div>
      <div className="text-center">
        <p className="text-white font-semibold text-base mb-1">Join the Live Chat</p>
        <p className="text-white/40 text-xs">Pick a name to chat with thousands of listeners</p>
      </div>
      <input
        autoFocus
        type="text"
        placeholder="Your name..."
        maxLength={20}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && val.trim()) onDone(val.trim()); }}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-orange-400/50 transition-all"
      />
      <button
        onClick={() => val.trim() && onDone(val.trim())}
        className="w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:opacity-90 transition-opacity rounded-xl py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20"
      >
        Join Chat →
      </button>
    </div>
  );
}

// ── Main Chat Component ───────────────────────────────────────────────────────
export function LiveChat({ visible, isLive, onFloatingEmoji, onClose, isMobile }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [nameSet, setNameSet] = useState(false);
  const [sending, setSending] = useState(false);
  const [superChatMode, setSuperChatMode] = useState(false);
  const [inCall, setInCall] = useState(false);
  const lastTsRef = useRef<number>(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/chat/messages?since=${lastTsRef.current}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages?.length > 0) {
        setMessages(prev => [...prev, ...data.messages].slice(-200));
        lastTsRef.current = data.server_time;
      }
    } catch { /* ignore */ }
  }, [apiBase]);

  useEffect(() => {
    if (!visible) return;
    poll();
    const iv = setInterval(poll, 2000);
    return () => clearInterval(iv);
  }, [visible, poll]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const postMessage = async (msg: string, type: string) => {
    await fetch(`${apiBase}/api/chat/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: username, message: msg, type }),
    });
    await poll();
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    const type = superChatMode ? "superchat" : "normal";
    await postMessage(text, type);
    setInput("");
    setSuperChatMode(false);
    setSending(false);
    inputRef.current?.focus();
  };

  const sendReaction = async (emoji: string) => {
    await postMessage(emoji, "reaction");
    // trigger floating emoji
    onFloatingEmoji?.({
      id: Math.random().toString(36).slice(2),
      emoji,
      x: 30 + Math.random() * 40, // appear mostly center-right
    });
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (!nameSet) {
    return (
      <AnimatePresence>
        {visible && (
          <motion.div
            key="name-picker"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
            className="flex flex-col h-full"
          >
            <NamePicker onDone={name => { setUsername(name); setNameSet(true); }} />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="chat-panel"
          initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
          className="flex flex-col h-full"
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-70">
                <circle cx="12" cy="12" r="3" fill="#fb923c"/>
                <path d="M6.3 6.3a8 8 0 010 11.4M17.7 6.3a8 8 0 010 11.4" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M3 3a14 14 0 010 18M21 3a14 14 0 010 18" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
              </svg>
              <span className="text-xs font-bold tracking-widest" style={{ color: "#fb923c", letterSpacing: "0.15em" }}>frequency</span>
            </div>
            {/* Call Button */}
            <button
              onClick={() => isLive && setInCall(prev => !prev)}
              title={isLive ? (inCall ? "End call" : "Call in") : "Calls available when on air"}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                !isLive
                  ? "bg-white/5 text-white/20 cursor-not-allowed"
                  : inCall
                  ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                  : "bg-green-500/15 text-green-400 border border-green-500/20 hover:bg-green-500/25 cursor-pointer"
              }`}
            >
              {inCall ? <PhoneOff className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
              <span>{inCall ? "End" : "Call In"}</span>
            </button>
          </div>

          {/* ── Call Banner ── */}
          <AnimatePresence>
            {inCall && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden shrink-0"
              >
                <div className="bg-green-500/10 border-b border-green-500/20 px-4 py-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 text-xs font-medium">You&apos;re live on air — speak up! 🎙️</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5"
            style={{ scrollbarWidth: "none" }}>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
                <span className="text-3xl">👀</span>
                <p className="text-white/25 text-xs">No messages yet.<br />Say hi — Ife and Tingo are listening!</p>
              </div>
            )}
            {messages.map((msg, i) => {
              const isAI = AI_NAMES.has(msg.user);
              const isSuper = msg.type === "superchat";
              const isReaction = msg.type === "reaction";
              const color = isAI ? "#fb923c" : getUserColor(msg.user);

              if (isReaction) {
                return (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 text-xs text-white/40">
                    <span className="text-base">{msg.message}</span>
                    <span style={{ color }}>{msg.user.split(" ")[0]}</span>
                    <span>reacted</span>
                  </motion.div>
                );
              }

              if (isSuper) {
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="relative rounded-xl overflow-hidden shrink-0"
                    style={{ background: "linear-gradient(135deg, rgba(251,146,60,0.25), rgba(239,68,68,0.15))", border: "1px solid rgba(251,146,60,0.4)" }}>
                    <div className="px-3 py-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Zap className="w-3 h-3 text-orange-400" />
                        <span className="text-orange-400 text-[10px] font-bold uppercase tracking-widest">Super Chat</span>
                      </div>
                      <span className="font-bold text-xs mr-1.5" style={{ color }}>{msg.user}:</span>
                      <span className="text-white text-sm font-medium">{msg.message}</span>
                    </div>
                  </motion.div>
                );
              }

              // Normal message
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.12 }}
                  className={`flex items-start gap-2 group ${isAI ? "bg-white/[0.04] rounded-xl px-3 py-2" : ""}`}>
                  {/* Avatar */}
                  <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold mt-0.5"
                    style={{ background: `${color}22`, color, border: `1px solid ${color}40` }}>
                    {getInitials(msg.user)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-xs mr-1.5" style={{ color }}>{msg.user}</span>
                    {isAI && <span className="text-orange-400/60 text-[9px] uppercase tracking-wider mr-1">AI Host</span>}
                    <span className="text-white/80 text-sm leading-snug break-words">{msg.message}</span>
                  </div>
                </motion.div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* ── Emoji Reaction Bar ── */}
          <div className="px-3 pb-2 shrink-0">
            <div className="flex items-center justify-between">
              {REACTIONS.map(({ emoji, label }) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  title={label}
                  className="flex flex-col items-center gap-0.5 w-10 h-10 rounded-xl hover:bg-white/8 active:scale-90 transition-all flex-1 justify-center"
                >
                  <span className="text-lg leading-none">{emoji}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Tip + Input ── */}
          <div className="px-3 pb-1 shrink-0">
            <p className="text-white/15 text-[10px] text-center">
              type <span className="text-white/30">&quot;play [song]&quot;</span> to request a track 🎵
            </p>
          </div>
          <div className="px-3 pb-4 shrink-0 space-y-2">
            {/* Super Chat toggle */}
            <AnimatePresence>
              {superChatMode && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden">
                  <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-1.5 text-xs text-orange-400">
                    <Zap className="w-3 h-3" />
                    <span>Super Chat — your message will pop up on screen for everyone!</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-all ${
              superChatMode
                ? "bg-orange-500/10 border border-orange-400/40"
                : "bg-white/5 border border-white/10 focus-within:border-white/20"
            }`}>
              <span className="text-xs shrink-0 font-bold" style={{ color: getUserColor(username) }}>
                {username}
              </span>
              <input
                ref={inputRef}
                type="text"
                placeholder={superChatMode ? "Your super chat message..." : "Say something..."}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                maxLength={200}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none min-w-0"
              />
              {/* Super chat toggle */}
              <button
                onClick={() => setSuperChatMode(m => !m)}
                title="Super Chat"
                className={`shrink-0 transition-colors ${superChatMode ? "text-orange-400" : "text-white/20 hover:text-white/40"}`}
              >
                <Zap className="w-4 h-4" />
              </button>
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="text-white/30 hover:text-orange-400 disabled:opacity-20 disabled:pointer-events-none transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Floating Emoji Overlay (rendered at radio page level) ─────────────────────
export function FloatingEmojiOverlay({ emojis }: { emojis: FloatingEmoji[] }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {emojis.map(fe => (
          <motion.div
            key={fe.id}
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -280, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.2, ease: "easeOut" }}
            className="absolute bottom-32 text-4xl select-none"
            style={{ left: `${fe.x}%` }}
          >
            {fe.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Super Chat Overlay (full-screen banner pop-up at radio page level) ─────────
export function SuperChatOverlay({ messages }: { messages: ChatMessage[] }) {
  const superChats = messages.filter(m => m.type === "superchat").slice(-1);
  return (
    <div className="pointer-events-none fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <AnimatePresence>
        {superChats.map((m, i) => (
          <motion.div
            key={`${m.ts}-${i}`}
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="rounded-2xl p-4 shadow-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(251,146,60,0.95), rgba(239,68,68,0.9))",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-white" />
              <span className="text-white/80 text-xs font-bold uppercase tracking-widest">Super Chat</span>
            </div>
            <p className="text-white font-bold text-sm">{m.user}</p>
            <p className="text-white/90 text-base mt-0.5">{m.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
