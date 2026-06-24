#!/usr/bin/env python3
"""
simple_liquidsoap.py — Drop-in Liquidsoap replacement for Tingo AI Radio.

Uses only Python stdlib + ffmpeg (already installed by start_radio.sh).
Listens on TCP 1234 for the exact same commands Liquidsoap accepts:
    show_api.push /absolute/path/to/file.mp3
    show_api.skip
    interactive_api.push /absolute/path/to/file.mp3
    interactive_api.flush

Falls back to random music from media/music/ when all queues are empty.
"""

import socket
import threading
import subprocess
import os
import time
import logging
import random
from collections import deque

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [SimpleLS] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("simple_liquidsoap")

# ─── Config ──────────────────────────────────────────────────────────────────
ICECAST_URL  = "icecast://source:hackme@localhost:8000/stream"
TELNET_HOST  = "127.0.0.1"
TELNET_PORT  = 1234

# Relative to this script — works on any machine, no hardcoded paths
BACKEND_DIR  = os.path.abspath(os.path.dirname(__file__))
MUSIC_DIR    = os.path.join(BACKEND_DIR, "media", "music")

# ─── State ───────────────────────────────────────────────────────────────────
_queues: dict = {
    "show_api":        deque(),
    "interactive_api": deque(),
}
_ql = threading.Lock()           # Queue lock

_proc      = None                # Current ffmpeg process
_proc_lock = threading.Lock()

# Music fallback shuffle state
_music_queue: list = []

# ─── Music Fallback ──────────────────────────────────────────────────────────

def _get_next_music() -> str:
    """Return songs in shuffled order; refill when exhausted."""
    global _music_queue
    if not os.path.isdir(MUSIC_DIR):
        return ""
    if not _music_queue:
        songs = [f for f in os.listdir(MUSIC_DIR) if f.lower().endswith(".mp3")]
        if not songs:
            return ""
        random.shuffle(songs)
        _music_queue = songs
        logger.info(f"🎵 Music fallback reshuffled: {len(_music_queue)} tracks")
    return os.path.join(MUSIC_DIR, _music_queue.pop())

# ─── Streaming ───────────────────────────────────────────────────────────────

def _stream(filepath: str) -> None:
    """Stream one file to Icecast via ffmpeg, real-time (-re flag)."""
    global _proc
    if not os.path.exists(filepath):
        logger.warning(f"File missing, skipping: {filepath}")
        return

    logger.info(f"▶  {os.path.basename(filepath)}")
    cmd = [
        "ffmpeg", "-re",
        "-i", filepath,
        "-vn",
        "-acodec", "libmp3lame",
        "-ab",     "128k",
        "-f",      "mp3",
        ICECAST_URL,
        "-y",
        "-loglevel", "quiet"
    ]
    with _proc_lock:
        _proc = subprocess.Popen(cmd)
    _proc.wait()
    with _proc_lock:
        _proc = None


def _playback_loop() -> None:
    """Main playback loop: interactive → show → music fallback."""
    while True:
        filepath = None
        with _ql:
            if _queues["interactive_api"]:
                filepath = _queues["interactive_api"].popleft()
            elif _queues["show_api"]:
                filepath = _queues["show_api"].popleft()

        if not filepath:
            filepath = _get_next_music()

        if filepath:
            _stream(filepath)
        else:
            time.sleep(0.5)

# ─── Telnet command handler ───────────────────────────────────────────────────

def _handle(conn: socket.socket) -> None:
    """Process one telnet connection (called in own thread)."""
    global _proc
    try:
        # Read until newline or socket closes
        raw = b""
        conn.settimeout(2.0)
        while True:
            try:
                chunk = conn.recv(4096)
            except socket.timeout:
                break
            if not chunk:
                break
            raw += chunk
            if b"\n" in raw:
                break

        text = raw.decode("utf-8", errors="replace").strip()

        for line in text.split("\n"):
            line = line.strip()
            if not line:
                continue

            # ── queue.push /path ──────────────────────────────────────────
            if ".push " in line:
                parts    = line.split(".push ", 1)
                qname    = parts[0].strip()
                filepath = parts[1].strip()
                with _ql:
                    if qname in _queues:
                        _queues[qname].append(filepath)
                        size = len(_queues[qname])
                        logger.info(f"[{qname}] + {os.path.basename(filepath)}  (q={size})")
                        conn.sendall(f"{size}\n".encode())
                    else:
                        conn.sendall(b"ERR: unknown queue\n")

            # ── queue.skip ────────────────────────────────────────────────
            elif ".skip" in line:
                with _proc_lock:
                    if _proc and _proc.poll() is None:
                        _proc.terminate()
                        logger.info("⏭  Skip")
                conn.sendall(b"OK\n")

            # ── queue.flush ───────────────────────────────────────────────
            elif ".flush" in line:
                qname = line.split(".")[0].strip()
                with _ql:
                    if qname in _queues:
                        _queues[qname].clear()
                        logger.info(f"[{qname}] Flushed")
                conn.sendall(b"OK\n")

            elif line.lower() == "exit":
                break

    except Exception as e:
        logger.debug(f"Client handler: {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass


def _telnet_server() -> None:
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind((TELNET_HOST, TELNET_PORT))
    srv.listen(64)
    logger.info(f"✅ Simple Liquidsoap ready on {TELNET_HOST}:{TELNET_PORT}")
    logger.info(f"   Icecast target : {ICECAST_URL}")
    logger.info(f"   Music fallback : {MUSIC_DIR}")
    while True:
        try:
            conn, _ = srv.accept()
            threading.Thread(target=_handle, args=(conn,), daemon=True).start()
        except Exception as e:
            logger.error(f"Accept error: {e}")

# ─── Entry ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logger.info("🎙️  Tingo AI Radio — Simple Liquidsoap starting…")
    threading.Thread(target=_playback_loop, daemon=True).start()
    _telnet_server()
