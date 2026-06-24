from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager
import uvicorn
import logging
import httpx

from app.services.automation import automation_service, get_radio_status
from app.services.ad_agent import start_ad_pregenerator
from app.api.websocket import router as websocket_router
from app.api.chat import router as chat_router
from app.api.shows import router as shows_router
from app.api.ads import router as ads_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up Tingo AI Radio backend...")
    automation_service.start()
    start_ad_pregenerator()  # Pre-generate ads in background at startup
    yield
    logger.info("Shutting down Tingo AI Radio backend...")
    automation_service.stop()

app = FastAPI(
    title="Tingo AI Radio Backend",
    description="The core orchestrator for AI Shows, 24/7 Streaming, and Live Interactions",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "https://www.tingoradio.ai", "https://tingoradio.ai"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.interactive import router as interactive_router

# Register the WebSocket and API routes
app.include_router(websocket_router)
app.include_router(chat_router)
app.include_router(shows_router)
app.include_router(interactive_router)
app.include_router(ads_router)

@app.get("/")
async def root():
    return {"status": "online", "message": "Tingo AI Radio Backend is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/api/status")
async def radio_status():
    """Returns current automation state so the frontend can gate the Call In button."""
    return get_radio_status()

from fastapi import Form
from app.services.automation import force_update_radio_state

@app.post("/api/internal/metadata")
async def internal_metadata(title: str = Form(""), artist: str = Form(""), filename: str = Form("")):
    """Webhook called by Liquidsoap every time the physical audio track changes."""
    force_update_radio_state(title, artist, filename)
    return {"status": "ok"}

import re
import os as _os

@app.get("/api/songs")
async def list_songs():
    """Returns all songs in the music library parsed from filenames."""
    MUSIC_DIR = _os.path.abspath(_os.path.join(_os.path.dirname(__file__), "../../media/music"))
    songs = []
    if not _os.path.isdir(MUSIC_DIR):
        return {"songs": []}
    
    # Patterns to strip from YouTube-downloaded filenames
    STRIP = re.compile(
        r'\s*[\(\[](official\s*(music\s*video|video|audio|visualizer|lyric\s*video|lyrics)|'
        r'lyric\s*video|lyrics|visualizer|audio|video)[\)\]]',
        re.IGNORECASE
    )
    
    for fname in sorted(_os.listdir(MUSIC_DIR)):
        if not fname.endswith(".mp3"):
            continue
        raw = fname[:-4]  # strip .mp3
        clean = STRIP.sub("", raw).strip()
        
        # Parse "Artist - Title" format
        if " - " in clean:
            artist, title = clean.split(" - ", 1)
            artist = artist.strip()
            title = title.strip()
        else:
            artist = "Various Artists"
            title = clean.strip()
        
        songs.append({
            "filename": fname,
            "artist": artist,
            "title": title,
        })
    
    return {"songs": songs}


@app.get("/api/stream")
async def stream_proxy():
    """
    Proxies the Icecast audio stream through this FastAPI server.
    This allows the frontend (on Vercel) to play audio through the single Cloudflare tunnel URL,
    without needing direct access to port 8000.
    """
    client = httpx.AsyncClient(timeout=None)
    
    async def audio_generator():
        try:
            async with client.stream("GET", "http://localhost:8000/stream") as response:
                async for chunk in response.aiter_bytes(chunk_size=8192):
                    yield chunk
        finally:
            await client.aclose()
    
    return StreamingResponse(
        audio_generator(),
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering if behind proxy
        }
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
