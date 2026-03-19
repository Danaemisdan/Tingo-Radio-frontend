"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InteractionPanel() {
    const [inputText, setInputText] = useState('');
    const [mode, setMode] = useState<'shoutout' | 'request'>('shoutout');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showToast, setShowToast] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        setIsSubmitting(true);
        // Simulate API call
        setTimeout(() => {
            setIsSubmitting(false);
            setInputText('');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }, 800);
    };

    return (
        <div className="w-full relative flex flex-col p-6 bg-[#0a0a0a] border border-zinc-800 rounded-xl overflow-hidden group hover:border-zinc-500 transition-colors">

            {/* Header */}
            <h3 className="text-xl font-bold bg-white bg-clip-text text-transparent mb-6 tracking-tight">Connect</h3>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10 w-full mb-2">
                {/* Toggle Mode */}
                <div className="flex bg-black p-1 rounded-lg border border-zinc-800">
                    <button
                        type="button"
                        onClick={() => setMode('shoutout')}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${mode === 'shoutout' ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                    >
                        Shoutout
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('request')}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${mode === 'request' ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                    >
                        Request
                    </button>
                </div>

                {/* Input Area */}
                <div className="relative">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={mode === 'shoutout' ? "Message the host..." : "Request a track..."}
                        className="w-full bg-black/40 border border-zinc-800 rounded-lg pl-4 pr-20 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all font-mono"
                        disabled={isSubmitting}
                    />
                    <button
                        type="submit"
                        disabled={!inputText.trim() || isSubmitting}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-wider text-black bg-white hover:bg-zinc-200 px-4 py-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isSubmitting ? '...' : 'SEND'}
                    </button>
                </div>
            </form>

            {/* Toast Notification */}
            <AnimatePresence>
                {showToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: -10, x: '-50%' }}
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white text-black text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap"
                    >
                        Sent to AI DJ Host
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
