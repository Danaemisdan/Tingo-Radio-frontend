"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChatPopout() {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);

    const handleSend = async () => {
        if (!message.trim() || isSending) return;
        setIsSending(true);
        try {
            const formData = new FormData();
            formData.append("text", message);
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://1dd7-2409-40f0-46-1752-4495-2514-4da2-caaf.ngrok-free.app';
            await fetch(`${apiBase}/api/audience/message`, { 
                method: "POST", 
                body: formData 
            });
            setMessage("");
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to send message", error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="relative flex items-center h-full pointer-events-auto">
            <AnimatePresence mode="wait">
                {!isOpen ? (
                    <motion.button
                        key="icon"
                        onClick={() => setIsOpen(true)}
                        initial={{ opacity: 0, scale: 0.5, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors backdrop-blur-md"
                    >
                        <MessageCircle className="w-5 h-5" />
                    </motion.button>
                ) : (
                    <motion.div
                        key="input"
                        initial={{ opacity: 0, width: 40, x: 20 }}
                        animate={{ opacity: 1, width: 220, x: 0 }}
                        exit={{ opacity: 0, width: 40 }}
                        className="flex items-center bg-zinc-950/80 backdrop-blur-xl border border-white/20 rounded-full h-12 pl-4 pr-1 shadow-2xl overflow-hidden"
                    >
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            onBlur={() => !message.trim() && setIsOpen(false)}
                            placeholder="Message OAPs..."
                            className="bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none flex-1 min-w-0"
                            autoFocus
                        />
                        <button
                            onClick={handleSend}
                            disabled={!message.trim() || isSending}
                            className={cn(
                                "w-9 h-9 ml-2 rounded-full flex items-center justify-center transition-all shrink-0",
                                message.trim() && !isSending ? "bg-white text-black hover:bg-zinc-200" : "bg-white/10 text-white/30"
                            )}
                        >
                            <Send className="w-4 h-4 ml-[-2px]" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
