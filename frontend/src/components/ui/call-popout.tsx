"use client";

import React from "react";
import { Phone } from "lucide-react";

export function CallPopout() {
    // The user explicitly requested to freeze and disable the Call Button temporarily
    // and lock its scaling to exactly match the Chat Popout to maintain absolute centering of the Play button.
    return (
        <div className="relative flex items-center justify-center h-full pointer-events-auto">
            <button
                className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors backdrop-blur-md"
            >
                <Phone className="w-5 h-5" />
            </button>
        </div>
    );
}
