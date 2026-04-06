from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging
import uuid
import os
import asyncio
from app.services.stt import stt_service
from app.services.llm import llm_generate
from app.services.automation import push_to_liquidsoap_sync, skip_liquidsoap_track, _radio_state
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
            
            # Immediately tell backend we are aggressively in interactive mode
            if _radio_state["current_segment"] != "interactive":
                _radio_state["is_show_live"] = True
                _radio_state["current_segment"] = "interactive"
                skip_liquidsoap_track()
                
                # Push silence to the underlying show queue.
                # If we don't do this, every microsecond of silence between the AI's words will
                # cause Liquidsoap to fall backward to the music playlist!
                silence_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../media/silence_120s.wav"))
                if not os.path.exists(silence_path):
                    from pydub import AudioSegment as _AS
                    _AS.silent(duration=120000).export(silence_path, format="wav")
                push_to_liquidsoap_sync(silence_path, queue_name="show_api")
            
            # 2. Fast STT
            transcript = stt_service.transcribe_audio_chunk(data)
            if not transcript or len(transcript.strip()) < 2:
                continue
                
            logger.info(f"[CALLER INPUT]: {transcript}")
            await websocket.send_text(f"STT: {transcript}")
            
            # Broadcast caller's raw audio chunk to the world so they hear the caller speak too
            # We convert the raw WebM byte buffer to a pure WAV file for Liquidsoap compatibility
            caller_wav = os.path.join(SHOWS_DIR, f"caller_{uuid.uuid4().hex[:6]}.wav")
            caller_wav = os.path.join(SHOWS_DIR, f"caller_{uuid.uuid4().hex[:6]}.wav")
            try:
                import subprocess
                webm_tmp = caller_wav.replace(".wav", ".webm")
                with open(webm_tmp, "wb") as f:
                    f.write(data)
                
                # Use a strict hard-timeout ffmpeg call so it NEVER hangs the websocket loop!
                subprocess.run([
                    "ffmpeg", "-y", "-i", webm_tmp, 
                    "-ar", "24000", "-ac", "1", caller_wav
                ], timeout=3, capture_output=True)
                
                if os.path.exists(caller_wav):
                    push_to_liquidsoap_sync(caller_wav, queue_name="interactive_api")
            except Exception as e:
                logger.error(f"Failed to transcode and push caller audio to liquidsoap: {e}")
            
            # 3. Stream the LLM text -> TTS -> WebSocket
            generator = llm_generate.generate_conversational_response_stream(transcript, show_profile)
            
            # We iterate over the sentence chunks the LLM stream yields
            # The LLM lock runs synchronously via asyncio.to_thread to not block the socket
            
            # Capture the primary main event loop safely BEFORE entering the thread block
            main_loop = asyncio.get_running_loop()
            
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
                            
                        # A) Blast audio to caller instantly using the correct main loop pointer
                        asyncio.run_coroutine_threadsafe(websocket.send_bytes(wav_data), main_loop)
                        
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

