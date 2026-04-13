#!/bin/sh
# ============================================================
# Tingo AI Radio — Full Stack Startup Script
# Coqui XTTS is the ONLY TTS engine. No Fish. No Kokoro.
# Run from the backend/ directory.
# ============================================================

BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🎙️  Tingo AI Radio — Starting Up..."
echo "====================================="

# Kill stale processes
echo "🧹 Cleaning up stale processes..."
pkill -9 -f "uvicorn" 2>/dev/null || true
pkill -9 -f "liquidsoap" 2>/dev/null || true
pkill -9 -f "icecast2" 2>/dev/null || true
pkill -9 -f "icecast -c" 2>/dev/null || true
pkill -9 -f "cloudflared" 2>/dev/null || true
sleep 2

cd "$BACKEND_DIR"

# ─── Python: always use Apple's locked-in 3.9 so PyArmor decrypts correctly ───
PYTHON_CMD="/usr/bin/python3"
if [ ! -x "$PYTHON_CMD" ]; then
    PYTHON_CMD="$(command -v python3)"
fi

# ─── Main virtualenv ───────────────────────────────────────────────────────────
if [ ! -d ".venv" ] && [ ! -d "venv" ]; then
    echo "🌀 Creating fresh .venv..."
    "$PYTHON_CMD" -m venv .venv
fi

if [ -f ".venv/bin/activate" ]; then
    . .venv/bin/activate
elif [ -f "venv/bin/activate" ]; then
    . venv/bin/activate
fi

# ─── Install backend dependencies ─────────────────────────────────────────────
if [ -f "requirements.txt" ]; then
    echo "📦 Installing backend requirements..."
    pip install -q -r requirements.txt 2>&1 | grep -E "^(ERROR|Successfully installed|Collecting llama)" || true
fi

# ─── System tools check ───────────────────────────────────────────────────────
echo "📦 Checking system tools..."
for cmd in ffmpeg icecast; do
    if ! command -v "$cmd" > /dev/null 2>&1; then
        echo "   ⚠️  $cmd not found — trying Homebrew..."
        brew install "$cmd" 2>/dev/null || echo "   ⚠️  Could not auto-install $cmd. Please install manually."
    fi
done
echo "✅ System check done."
echo ""

# ─── Start Icecast ────────────────────────────────────────────────────────────
echo "📻 Starting Icecast on :8000..."
icecast -c icecast.xml -b 2>/dev/null &
sleep 2

# ─── Start Liquidsoap ─────────────────────────────────────────────────────────
LIQUIDSOAP="${HOME}/.opam/default/bin/liquidsoap"
if [ ! -f "$LIQUIDSOAP" ]; then
    LIQUIDSOAP="$(which liquidsoap 2>/dev/null || echo "")"
fi
if [ -z "$LIQUIDSOAP" ]; then
    echo "   ⚠️  liquidsoap not found — skipping. Install with: opam install liquidsoap"
else
    echo "🎵 Starting Liquidsoap..."
    nohup "$LIQUIDSOAP" radio.liq > /tmp/liquidsoap.log 2>&1 &
    sleep 3
fi

# NOTE: Shows and ads use edge-tts (en-NG-EzinneNeural / en-NG-AbeoNeural) directly.
# No separate TTS server needed — edge-tts is in the main .venv.

# ─── Start FastAPI Backend on :8080 ───────────────────────────────────────────
echo "⚙️  Starting FastAPI on :8080..."
nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8080 > /tmp/fastapi.log 2>&1 &
sleep 5

# Health check
echo -n "   Backend health check... "
if curl -sf --max-time 5 'http://localhost:8080/api/chat/messages?since=0' > /dev/null 2>&1; then
    echo "✅ OK"
else
    echo "⚠️  Not responding yet (check: tail -f /tmp/fastapi.log)"
fi

# ─── Cloudflare Tunnels ───────────────────────────────────────────────────────
echo ""
echo "🌐 Starting Cloudflare Tunnels..."

if [ -f ~/.cloudflared/config.yml ]; then
    TUNNEL_NAME="$(grep '^tunnel:' ~/.cloudflared/config.yml | awk '{print $2}')"
    echo "   Using named tunnel: $TUNNEL_NAME"
    cloudflared tunnel run "$TUNNEL_NAME" > /tmp/cf_api.log 2>&1 &
else
    echo "   Starting temp API tunnel (port 8080)..."
    cloudflared tunnel --url http://localhost:8080 > /tmp/cf_api.log 2>&1 &
fi

echo "   Starting stream tunnel (port 8000)..."
cloudflared tunnel --url http://localhost:8000 > /tmp/cf_stream.log 2>&1 &

echo -n "   Waiting for tunnel URLs"
i=1
while [ "$i" -le 15 ]; do
    sleep 2
    printf "."
    API_URL="$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com\|https://[a-z0-9-]*\.cfargotunnel\.com' /tmp/cf_api.log 2>/dev/null | head -1)"
    STREAM_URL="$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com\|https://[a-z0-9-]*\.cfargotunnel\.com' /tmp/cf_stream.log 2>/dev/null | head -1)"
    if [ -n "$API_URL" ] && [ -n "$STREAM_URL" ]; then break; fi
    i="$((i + 1))"
done
echo ""

echo ""
echo "====================================="
echo "✅ Tingo AI Radio is LIVE!"
echo ""
echo "📋 COPY THESE TO VERCEL → Settings → Environment Variables → Redeploy:"
echo ""
echo "   NEXT_PUBLIC_API_URL    = ${API_URL:-'(check /tmp/cf_api.log)'}"
echo "   NEXT_PUBLIC_STREAM_URL = ${STREAM_URL:-'(check /tmp/cf_stream.log)'}"
echo ""
echo "⚠️  These URLs CHANGE on every restart — update Vercel each time."
echo "    To fix permanently: cloudflared tunnel login && cloudflared tunnel create tingo"
echo ""
echo "📋 Logs:"
echo "   tail -f /tmp/fastapi.log    ← main API"
echo "   tail -f /tmp/tts_server.log ← Coqui XTTS"
echo "   tail -f /tmp/cf_api.log     ← cloudflare"
echo ""
echo "🛑 To stop:"
echo "   pkill -f 'uvicorn|liquidsoap|icecast|cloudflared'"
