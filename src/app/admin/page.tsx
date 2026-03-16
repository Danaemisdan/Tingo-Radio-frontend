"use client";
import React, { useState } from "react";

export default function AdminDashboard() {
    const [topic, setTopic] = useState("");
    const [duration, setDuration] = useState(60);
    const [status, setStatus] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerateShow = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus("Submitting request...");

        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
            const response = await fetch(`${apiBase}/api/generate_show`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    topic: topic,
                    duration_seconds: duration,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus(`✅ Success: ${data.detail}`);
                setTopic(""); // Clear for the next show
            } else {
                setStatus(`❌ Error: ${data.detail || "Failed to generate show"}`);
            }
        } catch (error) {
            console.error(error);
            setStatus("❌ Network error: Could not reach the FastAPI backend.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#060606] text-white p-8 font-sans">
            <div className="max-w-2xl mx-auto mt-20">
                <h1 className="text-4xl font-bold mb-2">Tingo AI Radio Control Panel</h1>
                <p className="text-gray-400 mb-8">
                    Dynamically produce hyper-emotional, zero-shot audio shows and push them straight to the live broadcast feed.
                </p>

                <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-2xl">
                    <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                        🎙️ Produce a Live Segment
                    </h2>

                    <form onSubmit={handleGenerateShow} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                What should Ife & Tingo talk about?
                            </label>
                            <textarea
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g. Discuss the latest breakthroughs in local AI models vs cloud APIs, and why open-source models are winning..."
                                className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Desired Duration (Seconds)
                            </label>
                            <input
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
                                min={15}
                                max={300}
                                className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !topic.trim()}
                            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${isLoading || !topic.trim()
                                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                                }`}
                        >
                            {isLoading ? "⚡ Synthesizing Show & Pushing to Stream..." : "🚀 Generate & Queue Show"}
                        </button>
                    </form>

                    {status && (
                        <div className={`mt-6 p-4 rounded-xl border ${status.includes('✅') ? 'bg-green-900/20 border-green-800 text-green-400' : 'bg-red-900/20 border-red-800 text-red-400'}`}>
                            {status}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
