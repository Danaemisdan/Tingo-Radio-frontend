from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging
import uuid
import os
import asyncio
import threading
from app.services.show_generator import show_generator
from app.services.automation import automation_service

logger = logging.getLogger(__name__)

router = APIRouter()

class ShowRequest(BaseModel):
    topic: str
    duration_seconds: int = 45

class ShowResponse(BaseModel):
    status: str
    detail: str
    show_id: str

async def generate_and_queue_show(topic: str, show_id: str, duration: int):
    """
    Async coroutine that generates a custom show and pushes it to Liquidsoap.
    Designed to be run inside its own thread with its own event loop.
    """
    try:
        output_name = f"custom_show_{show_id}.mp3"
        logger.info(f"--- Starting Custom Generation: {topic} ---")
        
        audio_path = await show_generator.generate_show_segment(topic, output_name)
        
        if audio_path and os.path.exists(audio_path):
            logger.info(f"Custom Show {show_id} ready. Pushing to Liquidsoap queue.")
            await automation_service.push_to_liquidsoap(audio_path)
            
    except Exception as e:
        logger.error(f"Failed to process custom show: {e}")


def run_show_in_background(topic: str, show_id: str, duration: int):
    """
    Runs the show generation coroutine in a fresh event loop inside a daemon thread.
    This avoids nested asyncio loop conflicts with FastAPI's uvicorn event loop.
    """
    asyncio.run(generate_and_queue_show(topic, show_id, duration))


@router.post("/api/generate_show", response_model=ShowResponse)
async def generate_custom_show(request: ShowRequest):
    """
    Accepts a custom topic from the React Frontend UI.
    Spins up a background daemon thread with its own event loop for generation.
    """
    if not request.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty.")
        
    show_id = uuid.uuid4().hex[:8]
    
    # Use a plain daemon thread with asyncio.run() to avoid FastAPI event loop conflicts
    thread = threading.Thread(
        target=run_show_in_background,
        args=(request.topic, show_id, request.duration_seconds),
        daemon=True
    )
    thread.start()
    
    return ShowResponse(
        status="success",
        detail=f"Show generation started for topic: '{request.topic}'. It will play on the stream when ready.",
        show_id=show_id
    )
