from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import os
import time
import shutil
from typing import List

router = APIRouter(prefix="/api/audience", tags=["audience"])

# Global queues to hold incoming interactions until the automation loop picks them up
audience_queue = {
    "calls": [],     # List of dicts: {"type": "call", "audio_path": str, "timestamp": float}
    "messages": []   # List of dicts: {"type": "message", "text": str, "timestamp": float}
}

AUDIENCE_MEDIA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../media/audience"))
os.makedirs(AUDIENCE_MEDIA_DIR, exist_ok=True)

@router.post("/call")
async def upload_call(audio: UploadFile = File(...)):
    if not audio:
        raise HTTPException(status_code=400, detail="No audio file provided")
    
    timestamp = time.time()
    filename = f"call_{int(timestamp)}.webm"
    file_path = os.path.join(AUDIENCE_MEDIA_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)

    audience_queue["calls"].append({
        "type": "call",
        "audio_path": file_path,
        "timestamp": timestamp
    })

    return {"status": "success", "message": "Call queued for live broadcast"}

@router.post("/message")
async def send_message(text: str = Form(...)):
    if not text.strip():
        raise HTTPException(status_code=400, detail="Empty message")
    
    audience_queue["messages"].append({
        "type": "message",
        "text": text,
        "timestamp": time.time()
    })

    return {"status": "success", "message": "Message queued for OAP readout"}

def get_next_audience_interaction():
    """Helper for the automation loop to pull the oldest interaction."""
    # Prioritize calls over messages, or just strictly oldest first
    all_interactions = audience_queue["calls"] + audience_queue["messages"]
    if not all_interactions:
        return None
    
    # Sort by timestamp (oldest first)
    all_interactions.sort(key=lambda x: x["timestamp"])
    oldest = all_interactions[0]

    # Remove from queue
    if oldest["type"] == "call":
        audience_queue["calls"].remove(oldest)
    else:
        audience_queue["messages"].remove(oldest)
        
    return oldest
