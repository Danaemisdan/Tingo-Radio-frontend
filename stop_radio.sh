#!/bin/bash
echo "🛑 Stopping Tingo AI Radio services safely..."

# Kill specific processes related to the radio without wiping system-wide processes
pkill -9 -f "app.main:app" 2>/dev/null || true
pkill -9 -f "main:app --host 0.0.0.0 --port 8001" 2>/dev/null || true
pkill -9 -f "radio.liq" 2>/dev/null || true
pkill -9 -f "icecast.xml" 2>/dev/null || true
pkill -9 -f "npm run dev -- -p 3001" 2>/dev/null || true
pkill -9 -f "Tingo AI radio" 2>/dev/null || true

# Specific cloudflare tunnel kills (port 8080 and 8000)
pkill -9 -f "cloudflared tunnel --url http://localhost:8080" 2>/dev/null || true
pkill -9 -f "cloudflared tunnel --url http://localhost:8000" 2>/dev/null || true

echo "✅ Tingo AI Radio fully stopped."
