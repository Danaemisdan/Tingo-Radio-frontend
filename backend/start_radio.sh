#!/bin/sh
# ============================================================
# Tingo AI Radio — Full Stack Startup Script
# Coqui XTTS is the ONLY TTS engine. No Fish. No Kokoro.
# Run from the backend/ directory.
# ============================================================

BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🎙️  Tingo AI Radio — Starting Up..."
echo "====================================="

# ─── Step 0: Strip macOS quarantine flags (fixes Gatekeeper blocking PyArmor) ──
# When the Shipping folder is downloaded via browser, macOS quarantines every file.
# This causes "pyarmor_runtime.so can't be opened" errors. Strip it immediately.
echo "🔓 Clearing macOS quarantine flags..."
xattr -dr com.apple.quarantine "$BACKEND_DIR" 2>/dev/null || true

# Kill stale processes
echo "🧹 Cleaning up stale processes..."
pkill -9 -f "uvicorn" 2>/dev/null || true
pkill -9 -f "liquidsoap" 2>/dev/null || true
pkill -9 -f "icecast2" 2>/dev/null || true
pkill -9 -f "icecast -c" 2>/dev/null || true
pkill -9 -f "cloudflared" 2>/dev/null || true
sleep 2

cd "$BACKEND_DIR"

# ─── Step 1: Ensure Homebrew is available ─────────────────────────────────────
if ! command -v brew > /dev/null 2>&1; then
    echo "🍺 Homebrew not found — installing..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # Add brew to PATH for Apple Silicon
    eval "$(/opt/homebrew/bin/brew shellenv)" 2>/dev/null || eval "$(/usr/local/bin/brew shellenv)" 2>/dev/null || true
fi

# ─── Step 2: Auto-install system dependencies ─────────────────────────────────
echo "📦 Checking system tools..."

# ffmpeg — needed for audio processing
if ! command -v ffmpeg > /dev/null 2>&1; then
    echo "   ⚙️  Installing ffmpeg..."
    brew install ffmpeg 2>/dev/null || echo "   ⚠️  ffmpeg install failed. Run: brew install ffmpeg"
fi

# icecast — audio streaming server
if ! command -v icecast > /dev/null 2>&1; then
    echo "   ⚙️  Installing icecast..."
    brew install icecast 2>/dev/null || echo "   ⚠️  icecast install failed. Run: brew install icecast"
fi

# cloudflared — tunnel for public URLs
if ! command -v cloudflared > /dev/null 2>&1; then
    echo "   ⚙️  Installing cloudflared..."
    brew install cloudflared 2>/dev/null || echo "   ⚠️  cloudflared install failed. Run: brew install cloudflared"
fi

# liquidsoap — audio scheduler/queue (via official Savonet tap or opam)
LIQUIDSOAP="${HOME}/.opam/default/bin/liquidsoap"
if [ ! -f "$LIQUIDSOAP" ]; then
    LIQUIDSOAP="$(command -v liquidsoap 2>/dev/null || echo "")"
fi
if [ -z "$LIQUIDSOAP" ]; then
    echo "   ⚙️  liquidsoap not found — installing via Savonet Homebrew tap..."
    # GIT_TERMINAL_PROMPT=0 prevents git from blocking on a GitHub username/password prompt
    # GIT_ASKPASS=/bin/echo forces any auth handler to echo empty string (non-interactive)
    GIT_TERMINAL_PROMPT=0 GIT_ASKPASS=/bin/echo brew tap savonet/liquidsoap 2>/dev/null || true
    GIT_TERMINAL_PROMPT=0 brew install liquidsoap 2>/dev/null && LIQUIDSOAP="$(command -v liquidsoap 2>/dev/null || echo "")"
    if [ -z "$LIQUIDSOAP" ]; then
        echo "   ⚠️  Could not auto-install liquidsoap."
        echo "      To install manually: brew tap savonet/liquidsoap && brew install liquidsoap"
        echo "      Radio will run — shows/ads will synthesize but won't stream until liquidsoap is installed."
    fi
fi

# python3.10 — required for Coqui TTS (Python 3.9 is incompatible)
XTTS_PYTHON="$(command -v python3.10 2>/dev/null || echo "")"
if [ -z "$XTTS_PYTHON" ]; then
    echo "   ⚙️  python3.10 not found — installing via Homebrew..."
    brew install python@3.10 2>/dev/null
    # Add brew python3.10 to PATH
    BREW_PY310="$(brew --prefix python@3.10 2>/dev/null)/bin/python3.10"
    if [ -f "$BREW_PY310" ]; then
        XTTS_PYTHON="$BREW_PY310"
        echo "   ✅ python3.10 installed at $XTTS_PYTHON"
    else
        echo "   ❌ python3.10 install failed. XTTS voice cloning will be skipped."
    fi
fi

echo "✅ System check done."
echo ""

# ─── LLM GPU mode: MacBook Pro uses Metal GPU (-1 = full offload, saves RAM).
# Mac Studio M1 Ultra had a Metal driver crash bug — force CPU-only there.
HW_MODEL="$(sysctl -n hw.model 2>/dev/null || echo '')"
if echo "$HW_MODEL" | grep -qi "MacStudio"; then
    export LLM_GPU_LAYERS=0
    echo "   ⚙️  Mac Studio detected → LLM using CPU-only mode (Metal crash workaround)"
else
    export LLM_GPU_LAYERS=-1
    echo "   ⚙️  GPU (Metal) acceleration enabled for LLM → lower RAM usage"
fi
echo ""

# ─── Python: use the default python3 so it matches the PyArmor build version ──
PYTHON_CMD="$(command -v python3)"
if [ -z "$PYTHON_CMD" ]; then
    echo "❌ python3 not found. Please install Python."
    exit 1
fi

# ─── Main virtualenv ──────────────────────────────────────────────────────────
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

echo ""

# ─── Start Icecast ────────────────────────────────────────────────────────────
echo "📻 Starting Icecast on :8000..."
icecast -c icecast.xml -b 2>/dev/null &
sleep 2

# ─── Export MUSIC_DIR and launch Liquidsoap ───────────────────────────────────
MUSIC_ABS="$BACKEND_DIR/media/music"

if [ -n "$LIQUIDSOAP" ] && [ -f "$LIQUIDSOAP" ]; then
    echo "🎵 Starting Liquidsoap..."
    # Generate a temp .liq with the real absolute music path substituted in.
    # This avoids Liquidsoap version differences with getenv() / environment.get().
    sed "s|MUSIC_DIR_PLACEHOLDER|$MUSIC_ABS|g" "$BACKEND_DIR/radio.liq" > /tmp/tingo_radio.liq
    nohup "$LIQUIDSOAP" /tmp/tingo_radio.liq > /tmp/liquidsoap.log 2>&1 &
    sleep 3
elif [ -f "$BACKEND_DIR/simple_liquidsoap.py" ]; then
    echo "🎵 Starting Python audio streamer (simple_liquidsoap)..."
    nohup "$PYTHON_CMD" "$BACKEND_DIR/simple_liquidsoap.py" > /tmp/liquidsoap.log 2>&1 &
    sleep 2
    echo "   ✅ Python audio streamer running on port 1234"
else
    echo "   ⚠️  No audio streamer found — silence will play on stream."
fi

# ─── Start Coqui XTTS Server on :8001 ────────────────────────────────────────
# This is the ONLY TTS engine. It does zero-shot voice cloning for all shows/ads.
if [ -d "$BACKEND_DIR/tts_server" ]; then
    echo "🗣️  Starting Coqui XTTS on :8001..."
    cd "$BACKEND_DIR/tts_server"

    # ── Nuke broken symlinks and corrupt envs ─────────────────────────────────
    # A symlink xtts_env from the dev machine will ALWAYS be broken on any other machine.
    # A real xtts_env without a python binary is corrupt. Nuke both completely.
    if [ -L "xtts_env" ]; then
        echo "   🗑️  Removing old symlink xtts_env (path from another machine — rebuilding fresh)..."
        rm -f "xtts_env"
    fi
    if [ -d "xtts_env" ] && [ ! -f "xtts_env/bin/python" ]; then
        echo "   🗑️  xtts_env is corrupt — removing and rebuilding..."
        rm -rf "xtts_env"
    fi

    # Ensure outputs dir always exists
    mkdir -p "outputs"

    if [ ! -d "xtts_env" ]; then
        if [ -n "$XTTS_PYTHON" ] && [ -f "$XTTS_PYTHON" ]; then
            echo "   🌀 First run: building XTTS environment with python3.10 (takes a few minutes)..."
            "$XTTS_PYTHON" -m venv xtts_env
            . xtts_env/bin/activate
            pip install -q -U pip
            pip install -q torch torchaudio
            pip install -q TTS
            pip install -q fastapi uvicorn requests pydub
        else
            echo "   ❌ python3.10 unavailable — XTTS voice cloning skipped."
            echo "      Fix: brew install python@3.10 — then restart start_radio.sh"
        fi
    else
        if [ -f "xtts_env/bin/activate" ]; then
            . xtts_env/bin/activate
        fi
    fi

    if [ -f "xtts_env/bin/activate" ]; then
        export COQUI_TOS_AGREED=1
        nohup python -m uvicorn main:app --host 0.0.0.0 --port 8001 > /tmp/tts_server.log 2>&1 &
        echo "   ⏳ Waiting for XTTS model to load..."
        echo "   (First run downloads ~2GB model — can take 10+ min. Dots = still loading)"
        i=1
        while [ "$i" -le 120 ]; do
            sleep 5
            if curl -sf --max-time 2 http://localhost:8001/health > /dev/null 2>&1; then
                echo ""
                echo "   ✅ XTTS server ready!"
                break
            fi
            printf "."
            i="$((i + 1))"
        done
        if [ "$i" -gt 120 ]; then
            echo ""
            echo "   ⚠️  XTTS did not respond in 10 min. FastAPI will retry in background."
            echo "      Check: tail -f /tmp/tts_server.log"
        fi
        echo ""
    fi

    # Re-activate the main venv for the FastAPI server
    cd "$BACKEND_DIR"
    if [ -f ".venv/bin/activate" ]; then
        . .venv/bin/activate
    elif [ -f "venv/bin/activate" ]; then
        . venv/bin/activate
    fi
fi

# ─── Start FastAPI Backend on :8080 (supervised — auto-restarts on OOM crash) ──
echo "⚙️  Starting FastAPI supervisor on :8080..."

# The supervisor runs in the background. If FastAPI crashes (e.g. OOM after 5 min),
# it automatically restarts within 15 seconds, clearing the 530/CORS errors.
(
  CRASH_COUNT=0
  while true; do
    CRASH_COUNT=$((CRASH_COUNT + 1))
    if [ "$CRASH_COUNT" -gt 1 ]; then
      echo "[FastAPI Supervisor] Restart #$CRASH_COUNT — clearing old files and waiting 15s..." >> /tmp/fastapi.log
      # Clean up accumulated TTS output files (memory leak vector)
      find "$BACKEND_DIR/tts_server/outputs/" -name "*.wav" -mmin +5 -delete 2>/dev/null || true
      find "$BACKEND_DIR/media/shows/" -name "*.mp3" -mmin +30 -delete 2>/dev/null || true
      sleep 15
    fi
    echo "[FastAPI Supervisor] Starting uvicorn (attempt $CRASH_COUNT)..." >> /tmp/fastapi.log
    cd "$BACKEND_DIR"
    if [ -f ".venv/bin/activate" ]; then . .venv/bin/activate; elif [ -f "venv/bin/activate" ]; then . venv/bin/activate; fi
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8080 >> /tmp/fastapi.log 2>&1
    echo "[FastAPI Supervisor] uvicorn exited (code $?) — will restart." >> /tmp/fastapi.log
  done
) &

echo "   ⏳ Waiting for FastAPI to boot (loading GGUF model — up to 6 min)..."
FASTAPI_READY=0
j=1
while [ "$j" -le 72 ]; do
    sleep 5
    if curl -sf --max-time 3 http://localhost:8080/health > /dev/null 2>&1; then
        echo ""
        echo "   ✅ FastAPI is up and healthy!"
        FASTAPI_READY=1
        break
    fi
    # Print a dot, and a heartbeat message every 30s so it doesn't look frozen
    if [ "$((j % 6))" -eq 0 ]; then
        printf " (${j} × 5s — still loading GGUF...)\n   "
    else
        printf "."
    fi
    j="$((j + 1))"
done
echo ""

if [ "$FASTAPI_READY" -eq 0 ]; then
    echo "   ❌ FastAPI did not respond in 6 min. Check: tail -f /tmp/fastapi.log"
    echo "   ⚠️  Update Vercel ONLY after FastAPI is confirmed up."
    echo "      Watch it: watch -n 5 'curl -s http://localhost:8080/health'"
    exit 1
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
