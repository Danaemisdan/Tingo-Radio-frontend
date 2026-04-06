from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging
import uuid
import os
import asyncio
from app.services.stt import stt_service
from app.services.llm import llm_generate
from app.services.automation import push_to_liquidsoap_sync
from app.services.tts import generate_line_audio_sync, SHOWS_DIR, VOICE_MAP

logger = logging.getLogger(__name__)
router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

manager = ConnectionManager()

@router.websocket("/ws/live_call")
async def live_call_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Load the mock show profile (or real one from state)
        show_profile = {
            "show_name": "Man vs Machine (Live)",
            "host1_name": "Ife",
            "host2_name": "TingoAI Max"
        }
        
        while True:
            # 1. We receive WebM audio chunks ~every 2 seconds from the browser
            data = await websocket.receive_bytes()
            if not data: continue
            
            # 2. Fast STT
            transcript = stt_service.transcribe_audio_chunk(data)
            if not transcript or len(transcript.strip()) < 2:
                continue
                
            logger.info(f"[CALLER INPUT]: {transcript}")
            await websocket.send_text(f"STT: {transcript}")
            
            # Broadcast caller's raw audio chunk to the world so they hear the caller speak too
            # We convert the raw WebM byte buffer to a pure WAV file for Liquidsoap compatibility
            caller_wav = os.path.join(SHOWS_DIR, f"caller_{uuid.uuid4().hex[:6]}.wav")
            try:
                import io
                from pydub import AudioSegment
                audio_segment = AudioSegment.from_file(io.BytesIO(data))
                audio_segment.export(caller_wav, format="wav")
                push_to_liquidsoap_sync(caller_wav, queue_name="interactive_api")
            except Exception as e:
                logger.error(f"Failed to transcode and push caller audio to liquidsoap: {e}")
            
            # 3. Stream the LLM text -> TTS -> WebSocket
            generator = llm_generate.generate_conversational_response_stream(transcript, show_profile)
            
            # We iterate over the sentence chunks the LLM stream yields
            # The LLM lock runs synchronously via asyncio.to_thread to not block the socket
            def consume_stream():
                for sentence in generator:
                    if not sentence.strip(): continue
                    logger.info(f"Streamed Sentence: {sentence}")
                    
                    # Synthesize fragment
                    # By default M-X uses TingoAI Max voice mapping (Dozy_target.wav)
                    ai_voice = VOICE_MAP.get(show_profile["host2_name"], "Dozy_target.wav")
                    chunk_wav = os.path.join(SHOWS_DIR, f"fragment_{uuid.uuid4().hex[:8]}.wav")
                    
                    try:
                        generate_line_audio_sync(sentence, ai_voice, chunk_wav)
                        
                        with open(chunk_wav, "rb") as f:
                            wav_data = f.read()
                            
                        # A) Blast audio to caller instantly
                        asyncio.run_coroutine_threadsafe(websocket.send_bytes(wav_data), asyncio.get_event_loop())
                        
                        # B) Queue to liquidsoap so the world hears it appended on air automatically
                        push_to_liquidsoap_sync(chunk_wav, queue_name="interactive_api")
                        
                    except Exception as e:
                        logger.error(f"Failed to synthesize streamed chunk: {e}")

            await asyncio.to_thread(consume_stream)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket Terminal Error: {e}")
        try:
            manager.disconnect(websocket)
        except:
            pass

