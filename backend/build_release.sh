#!/bin/bash
# ============================================================
# Tingo AI Radio — Production Release Builder
# ============================================================
# This script uses PyArmor to securely encrypt the raw intelligence
# of the radio while keeping standard config files completely editable.

BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$BACKEND_DIR")"
SHIPPING_DIR="$PROJECT_DIR/Shipping/backend"

echo "🔒 Initializing Tingo Radio Encrypted Build..."
echo "====================================="

# Ensure pyarmor is installed globally or in current env
if ! command -v pyarmor &> /dev/null; then
    echo "📦 Installing PyArmor..."
    python3 -m pip install pyarmor
fi

# Clean fresh build directory
rm -rf "$SHIPPING_DIR"
mkdir -p "$SHIPPING_DIR"

# Resolve exact pyarmor path since pip might place it outside the default PATH
PYARMOR_EXE="$HOME/Library/Python/3.9/bin/pyarmor"
if command -v pyarmor &> /dev/null; then
    PYARMOR_EXE=$(command -v pyarmor)
fi

cd "$BACKEND_DIR"

echo "🔐 Encrypting Core FastAPI Engine (app/)..."
"$PYARMOR_EXE" gen -O "$SHIPPING_DIR" -r app/

echo "🔐 Encrypting Zero-Shot Voice Cloning Engine (tts_server/)..."
# We DO NOT use -r here because we don't want to encrypt the massive PyTorch xtts_env!
"$PYARMOR_EXE" gen -O "$SHIPPING_DIR/tts_server" tts_server/main.py

echo "📂 Copying clear text configurables..."
# We explicitly copy only what is needed, leaving out virtual environments and raw pycache

# Core Orchestrators
cp start_radio.sh "$SHIPPING_DIR/"
cp radio.liq "$SHIPPING_DIR/"
cp icecast.xml "$SHIPPING_DIR/"
cp requirements.txt "$SHIPPING_DIR/"

# Configuration Rules
cp shows.json "$SHIPPING_DIR/"
cp tts_config.json "$SHIPPING_DIR/"
cp ads.json "$SHIPPING_DIR/"

# Media & AI Weights files
cp -r media/ "$SHIPPING_DIR/media/"
if [ -d "models" ]; then
    cp -r models/ "$SHIPPING_DIR/models/"
fi

echo ""
echo "====================================="
echo "✅ Build Complete!"
echo "📦 Your safe, encrypted redistributable folder is ready at:"
echo "   $PROJECT_DIR/Shipping/"
echo ""
echo "You can ZIP that folder and distribute it. If they try to open app/*.py,"
echo "they will only see encrypted garbage."
