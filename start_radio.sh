#!/bin/bash
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting Tingo AI Radio Ecosystem (Frontend & Backend)..."

# 1. Start Frontend in background
echo "Starting Next.js Frontend (Port 3001) in background..."
cd "$PROJECT_DIR/frontend"
npm run dev -- -p 3001 > /tmp/frontend.log 2>&1 &

# 2. Hand off to the robust backend script which spins up the radio, TTS, LLM, and Cloudflare tunnels
bash "$PROJECT_DIR/backend/start_radio.sh"

echo ""
echo "📱 Frontend is LIVE at: http://localhost:3001"
echo "To stop everything, run: pkill -9 -f 'uvicorn|liquidsoap|icecast|cloudflared|next|nc'"
