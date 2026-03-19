from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging
import json
import os
import requests
from app.services.stt import stt_service
from app.services.llm import llm_generate
from app.services.tts import generate_line_audio_sync, SHOWS_DIR, VOICE_MAP

logger = logging.getLogger(__name__)

router = APIRouter()

# Store active connections to broadcast to multiple users if needed
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"Client connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"Client disconnected. Total active: {len(self.active_connections)}")

manager = ConnectionManager()

@router.websocket("/ws/live_call")
async def live_call_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint that receives raw audio buffers from a human caller.
    It will pass this audio to STT, generate a response, and send back TTS audio.
    """
    await manager.connect(websocket)
    try:
        while True:
            # We expect to receive WebM or PCM audio blobs from the frontend MediaRecorder
            data = await websocket.receive_bytes()
            logger.debug(f"Received audio packet from caller: {len(data)} bytes")
            
            # 1. Transcribe the human caller's audio chunk
            transcript = stt_service.transcribe_audio_chunk(data)
            if transcript:
                logger.info(f"[CALLER INPUT]: {transcript}")
                
                # 2. Tell the UI we heard them
                await websocket.send_json({
                    "type": "stt_result",
                    "text": transcript
                })
                
                # 3. Send transcript to LLM -> Generate AI Reply
                logger.info("Generating AI Response to caller...")
                ai_reply = llm_generate.generate_radio_script(
                    topic=f"Respond to a caller who just said: {transcript}",
                    duration_seconds=10
                )
                
                # Send the text to the UI
                await websocket.send_json({
                    "type": "ai_reply_text",
                    "text": ai_reply
                })
                
                # 4. Synthesize the response back to audio
                logger.info("Synthesizing AI Response audio...")
                response_audio_path = os.path.join(SHOWS_DIR, "live_reply.wav")
                # Using our default voice for live answers
                await asyncio.to_thread(generate_line_audio_sync, ai_reply, VOICE_MAP["Ife"], response_audio_path)
                
                # 5. Push the audio to Liquidsoap's live Harbour port to override the stream
                logger.info("Pushing AI Response to live radio stream...")
                with open(response_audio_path, "rb") as f:
                    audio_data = f.read()
                    try:
                        res = requests.put(
                            "http://127.0.0.1:8005/live", 
                            auth=("source", "hackme"), 
                            data=audio_data,
                            headers={'Content-Type': 'audio/wav'}
                        )
                        logger.info(f"Stream override result: {res.status_code}")
                    except Exception as e:
                        logger.error(f"Failed to push to Liquidsoap Harbour: {e}")
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket Error: {e}")
        manager.disconnect(websocket)

