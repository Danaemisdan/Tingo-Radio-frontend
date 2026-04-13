#!/bin/bash
# ============================================================
# Tingo AI Radio — Full Stack Startup Script
# Run once to start everything. Copy the printed URLs to Vercel.
# ============================================================

BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$BACKEND_DIR")"

echo "🎙️  Tingo AI Radio — Starting Up..."
echo "====================================="

# Kill stale processes
echo "🧹 Cleaning up stale processes..."
pkill -9 -f "uvicorn" 2>/dev/null || true
pkill -9 -f "liquidsoap" 2>/dev/null || true
pkill -9 -f "icecast2|icecast -c" 2>/dev/null || true
pkill -9 -f "cloudflared" 2>/dev/null || true
sleep 2

cd "$BACKEND_DIR"

if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
    echo "🌀 Virtual environment missing. Creating fresh .venv for Mac Studio..."
    python3 -m venv .venv
fi
if [ -f "venv/bin/activate" ]; then
    . venv/bin/activate
elif [ -f ".venv/bin/activate" ]; then
    . .venv/bin/activate
fi

# Always ensure requirements.txt is met on cold start
if [ -f "requirements.txt" ]; then
    echo "📦 Satisfying requirements.txt..."
    python -m pip install -r requirements.txt
fi

# ============================================================
# AUTO-DEPENDENCY CHECKER (For fresh Mac Studio deployments)
# ============================================================
echo "📦 Checking system and Python dependencies..."

# System Dependencies via Homebrew
for cmd in ffmpeg icecast; do
  if ! command -v $cmd &> /dev/null; then
    echo "   ⚠️  $cmd not found! Auto-installing via Homebrew..."
    brew install $cmd
  fi
done

# Python TTS Dependencies
if ! python -c "import edge_tts" 2>/dev/null; then
  echo "   ⚠️  edge-tts python package missing! Auto-installing..."
  python -m pip install edge-tts
fi
if ! python -c "import kokoro_onnx" 2>/dev/null; then
  echo "   ⚠️  kokoro-onnx python package missing! Auto-installing..."
  python -m pip install kokoro-onnx soundfile requests
fi
if ! python -c "import pydub" 2>/dev/null; then
  echo "   ⚠️  pydub python package missing! Auto-installing..."
  python -m pip install pydub
fi

echo "✅ All dependencies verified."
echo ""

# Start Icecast
echo "📻 Starting Icecast on :8000..."
icecast -c icecast.xml -b &
sleep 2

# Liquidsoap is installed via opam — use explicit path
LIQUIDSOAP="${HOME}/.opam/default/bin/liquidsoap"
if [ ! -f "$LIQUIDSOAP" ]; then
  LIQUIDSOAP=$(which liquidsoap 2>/dev/null || echo "")
fi
if [ -z "$LIQUIDSOAP" ]; then
  echo "   ⚠️  liquidsoap not found — skipping. Install with: opam install liquidsoap"
else
  echo "🎵 Starting Liquidsoap..."
  nohup "$LIQUIDSOAP" radio.liq > /tmp/liquidsoap.log 2>&1 &
  sleep 3
fi

# Start XTTS TTS Server
if [ -d "$BACKEND_DIR/tts_server" ]; then
  echo "🗣️  Starting Coqui XTTS on :8001..."
  cd "$BACKEND_DIR/tts_server"
  
  if [ ! -d "xtts_env" ]; then
      echo "🌀 XTTS environment missing. Auto-installing massive Coqui TTS dependencies locally..."
      python3 -m venv xtts_env
      . xtts_env/bin/activate
      pip install -U pip
      # Install specific MacOS Torch versions to unlock Apple Silicon acceleration
      pip install torch torchaudio
      pip install TTS fastapi uvicorn requests pydub
  else
      if [ -f "xtts_env/bin/activate" ]; then . xtts_env/bin/activate; fi
  fi
  
  nohup python -m uvicorn main:app --host 0.0.0.0 --port 8001 > /tmp/tts_server.log 2>&1 &
  cd "$BACKEND_DIR"
  if [ -f "venv/bin/activate" ]; then
      . venv/bin/activate
  elif [ -f ".venv/bin/activate" ]; then
      . .venv/bin/activate
  fi
fi

# ============================================================
# FISH AUDIO (Fish Speech) AUTO-DEPLOY & SERVER
# ============================================================
echo "🐟 Checking Fish Audio Engine..."
if [ ! -d "$BACKEND_DIR/fish-speech" ]; then
    echo "   📥 Fish Speech missing! Auto-cloning massive payload from GitHub... (This may take a while)"
    cd "$BACKEND_DIR"
    git clone https://github.com/fishaudio/fish-speech.git
fi

if [ -d "$BACKEND_DIR/fish-speech" ]; then
    echo "   🐟 Starting Fish Speech on :8082..."
    cd "$BACKEND_DIR/fish-speech"
    
    if [ ! -d "fish_env" ]; then
        echo "   🌀 Fish environment missing. Building Apple Silicon PyTorch container..."
        python3 -m venv fish_env
        . fish_env/bin/activate
        pip install -U pip
        # Essential MacOS torch setup for Fish Audio MPS acceleration
        pip install torch torchaudio torchvision
        # Build Fish Audio
        pip install -e .
    else
        if [ -f "fish_env/bin/activate" ]; then . fish_env/bin/activate; fi
    fi
    
    echo "   🚀 Launching Fish API Server in background..."
    # Fish default API uses tools.api_server
    nohup python -m tools.api_server --listen 0.0.0.0:8082 > /tmp/fish_server.log 2>&1 &
    
    cd "$BACKEND_DIR"
    if [ -f "venv/bin/activate" ]; then
        . venv/bin/activate
    elif [ -f ".venv/bin/activate" ]; then
        . .venv/bin/activate
    fi
fi

# Start FastAPI
echo "⚙️  Starting FastAPI on :8080..."
nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8080 > /tmp/fastapi.log 2>&1 &
sleep 3

# Verify backend is up
echo -n "   Backend health check... "
if curl -sf --max-time 3 'http://localhost:8080/api/chat/messages?since=0' > /dev/null 2>&1; then
  echo "✅ OK"
else
  echo "⚠️  Not responding yet (may still be starting)"
fi

# Start Cloudflare Tunnels
echo ""
echo "🌐 Starting Cloudflare Tunnels..."

if [ -f ~/.cloudflared/config.yml ]; then
  # Named tunnel — permanent URL, never changes
  TUNNEL_NAME=$(grep "^tunnel:" ~/.cloudflared/config.yml | awk '{print $2}')
  echo "   Using named tunnel: $TUNNEL_NAME"
  cloudflared tunnel run "$TUNNEL_NAME" > /tmp/cf_api.log 2>&1 &
else
  # Temp tunnel — URL changes on restart, must update Vercel after each run
  echo "   Starting temp API tunnel (port 8080)..."
  cloudflared tunnel --url http://localhost:8080 > /tmp/cf_api.log 2>&1 &
fi

# Always start a separate stream tunnel for Icecast (HTTPS required for mobile Safari)
echo "   Starting stream tunnel (port 8000, needed for mobile)..."
cloudflared tunnel --url http://localhost:8000 > /tmp/cf_stream.log 2>&1 &

echo -n "   Waiting for tunnel URLs"
for i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 2
  echo -n "."
  API_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com\|https://[a-z0-9-]*\.cfargotunnel\.com' /tmp/cf_api.log 2>/dev/null | head -1)
  STREAM_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com\|https://[a-z0-9-]*\.cfargotunnel\.com' /tmp/cf_stream.log 2>/dev/null | head -1)
  if [ -n "$API_URL" ] && [ -n "$STREAM_URL" ]; then break; fi
done
echo ""

echo ""
echo "====================================="
echo "✅ Tingo AI Radio is LIVE!"
echo ""
echo "📋 COPY THESE TO VERCEL → Settings → Environment Variables → Redeploy:"
echo ""
echo "   NEXT_PUBLIC_API_URL    = ${API_URL:-"(still starting, check /tmp/cf_api.log)"}"
echo "   NEXT_PUBLIC_STREAM_URL = ${STREAM_URL:-"(still starting, check /tmp/cf_stream.log)"}"
echo ""
echo "⚠️  These URLs CHANGE on every restart — update Vercel each time."
echo "    To fix permanently: cloudflared tunnel login && cloudflared tunnel create tingo"
echo ""
echo "📋 Logs:"
echo "   tail -f /tmp/fastapi.log"
echo "   tail -f /tmp/cf_api.log"
echo "   tail -f /tmp/cf_stream.log"
echo ""
echo "🛑 To stop all services:"
echo "   pkill -f 'uvicorn|liquidsoap|icecast|cloudflared'"
