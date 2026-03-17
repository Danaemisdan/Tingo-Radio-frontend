"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Radio } from "lucide-react";

interface ChatMessage {
  user: string;
  message: string;
  ts: number;
}

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

const AI_NAMES = new Set(["Tingo AI Radio 🤖","Ife (AI Host) 🎙️","Tingo (AI Host) 🎙️"]);

interface LiveChatProps { visible: boolean; }

export function LiveChat({ visible }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [nameSet, setNameSet] = useState(false);
  const [sending, setSending] = useState(false);
  const lastTsRef = useRef<number>(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  // Poll for new messages every 2 seconds
  const poll = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/chat/messages?since=${lastTsRef.current}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        setMessages(prev => {
          const combined = [...prev, ...data.messages].slice(-200);
          return combined;
        });
        lastTsRef.current = data.server_time;
      }
    } catch { /* silently ignore network errors */ }
  }, [apiBase]);

  useEffect(() => {
    if (!visible) return;
    // Initial fetch of all existing messages
    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [visible, poll]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    const name = username || "Anonymous";
    try {
      await fetch(`${apiBase}/api/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: name, message: text }),
      });
      setInput("");
      // Poll immediately to show own message fast
      await poll();
    } catch { /* ignore */ }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Username picker shown first
  if (!nameSet) {
    return (
      <AnimatePresence>
        {visible && (
          <motion.div
            key="name-picker"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="flex flex-col justify-center items-center h-full gap-5 px-5"
          >
            <Radio className="w-8 h-8 text-orange-400 animate-pulse" />
            <p className="text-white/60 text-sm text-center leading-relaxed">
              Join the live chat.<br />Pick a name to start.
            </p>
            <input
              autoFocus
              type="text"
              placeholder="Your name..."
              maxLength={20}
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && username.trim()) setNameSet(true); }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-orange-400/50 transition-all"
            />
            <button
              onClick={() => username.trim() && setNameSet(true)}
              className="w-full bg-orange-500 hover:bg-orange-400 transition-colors rounded-xl py-2.5 text-sm font-semibold text-white"
            >
              Join Chat
            </button>
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
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          className="flex flex-col h-full"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-semibold text-white/70 uppercase tracking-widest">Live Chat</span>
            </div>
            <span className="text-xs text-white/30 font-mono">{username}</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {messages.length === 0 && (
              <div className="text-white/25 text-xs text-center mt-8 leading-relaxed">
                No messages yet.<br />Say hi — the AI hosts are listening 👀
              </div>
            )}
            {messages.map((msg, i) => {
              const isAI = AI_NAMES.has(msg.user);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.12 }}
                  className={`text-sm leading-snug break-words ${isAI ? "bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2" : ""}`}
                >
                  <span className="font-semibold mr-1.5" style={{ color: isAI ? "#fb923c" : getUserColor(msg.user) }}>
                    {msg.user}:
                  </span>
                  <span className="text-white/85">{msg.message}</span>
                </motion.div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Tip */}
          <div className="px-3 pb-1 shrink-0">
            <p className="text-white/20 text-[10px] text-center">
              type <span className="text-white/40">&quot;play [song]&quot;</span> to request a track 🎵
            </p>
          </div>

          {/* Input */}
          <div className="px-3 pb-4 shrink-0">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-orange-400/40 transition-colors">
              <span className="text-xs shrink-0 font-medium" style={{ color: getUserColor(username || "anon") }}>
                {username}
              </span>
              <input
                ref={inputRef}
                type="text"
                placeholder="Say something..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                maxLength={200}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none min-w-0"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="text-white/30 hover:text-orange-400 disabled:pointer-events-none disabled:opacity-30 transition-colors shrink-0"
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
