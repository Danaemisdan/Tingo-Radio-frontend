from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging
import time
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
        call_active = [True]
        generation_id = [0]
        
        session_pcm_bytes = b""
        current_transcript = ""
        duplicate_count = 0
        
        # Safe concurrent audio queue for sending TTS to the caller
        audio_out_queue = asyncio.Queue()
        
        # Reset AI memory so every new caller gets a fresh greeting.
        llm_generate.reset_conversation()

        while True:
            # Monitor BOTH the websocket for incoming speech AND the queue for outgoing audio
            receive_task = asyncio.create_task(websocket.receive_bytes())
            queue_task = asyncio.create_task(audio_out_queue.get())
            
            done, pending = await asyncio.wait(
                [receive_task, queue_task], 
                return_when=asyncio.FIRST_COMPLETED
            )
            
            # Cancel the task that didn't complete
            for p in pending:
                p.cancel()
                
            # If we received outgoing audio from the background Thread, send it to the frontend!
            # This completely bypasses the 20-30s Icecast radio stream delay.
            if queue_task in done:
                wav_data = queue_task.result()
                try:
                    await websocket.send_bytes(wav_data)
                except Exception as e:
                    logger.error(f"Failed to send binary TTS to UI: {e}")
                # We processed an audio chunk, skip to next iteration to poll again
                continue

            # 1. Receiver logic: handle incoming independent WebM chunk
            data = receive_task.result()
            if not data:
                continue

            # Switch to interactive mode on first call
            if _radio_state["current_segment"] != "interactive":
                _radio_state["is_show_live"] = True
                _radio_state["current_segment"] = "interactive"
                skip_liquidsoap_track()
                silence_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../media/silence_120s.wav"))
                if not os.path.exists(silence_path):
                    from pydub import AudioSegment as _AS
                    _AS.silent(duration=120000).export(silence_path, format="wav")
                push_to_liquidsoap_sync(silence_path, queue_name="show_api")

            # 2. Decode this standalone WebM chunk directly into raw PCM
            import tempfile, subprocess
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
                f.write(data)
                tmp_webm = f.name
            
            tmp_pcm = tmp_webm.replace(".webm", ".pcm")
            # Convert to s16le 16kHz mono without appending WebM headers
            subprocess.run([
                "ffmpeg", "-y", "-i", tmp_webm, "-f", "s16le", "-ar", "16000", "-ac", "1", tmp_pcm
            ], timeout=3, capture_output=True)
            
            if os.path.exists(tmp_pcm):
                with open(tmp_pcm, "rb") as f:
                    session_pcm_bytes += f.read()
                os.remove(tmp_pcm)
            os.remove(tmp_webm)

            # Cap PCM memory at 10 seconds (16000 hz * 2 bytes * 10s = 320,000 bytes)
            if len(session_pcm_bytes) > 320000:
                session_pcm_bytes = session_pcm_bytes[-320000:]
                
            # 3. Transcribe the accumulated clean PCM directly
            transcript = stt_service.transcribe_pcm(session_pcm_bytes)
            
            pending_text = None

            # 4. Debounce and flush logic
            if transcript and len(transcript.strip()) >= 2:
                # Same phrase? They might have stopped adding new words.
                if transcript == current_transcript:
                    duplicate_count += 1
                    # If we got the exact same transcript 2 chunks in a row, they stopped talking
                    if duplicate_count >= 2:
                        pending_text = current_transcript
                        current_transcript = ""
                        duplicate_count = 0
                        session_pcm_bytes = b""  # Clear audio buffer
                else:
                    # New words added!
                    current_transcript = transcript
                    duplicate_count = 0
                    logger.info(f"[CALLER INPUT]: {transcript}")
                    await websocket.send_text(f"STT: {transcript}")
            else:
                # VAD detected pure silence in the PCM
                if current_transcript:
                    # They were speaking, now stopped. Flush!
                    pending_text = current_transcript
                    current_transcript = ""
                    duplicate_count = 0
                    session_pcm_bytes = b""
                else:
                    # Pure silence, keep buffer small
                    if len(session_pcm_bytes) > 64000:  # >2s of silence
                        session_pcm_bytes = b""

            # NOTE: Caller audio is intentionally NOT pushed to Liquidsoap.
            # Previously every 2s chunk was queued, creating a 30-50s backlog
            # of caller audio ahead of the AI response in the playback queue.

            if pending_text:
                logger.info(f"[DISPATCH TO LLM]: '{pending_text}'")
                generation_id[0] += 1
                my_id = generation_id[0]
                generator = llm_generate.generate_conversational_response_stream(pending_text, show_profile)
                main_loop = asyncio.get_running_loop()

                def consume_stream(text, state_flag, gen_id, my_id):
                    try:
                        logger.info(f"Thread {my_id} starting!")
                        start_time = time.time()
                        first = True
                        for sentence in generator:
                            if first:
                                logger.info(f"Thread {my_id} first LLM sentence in {time.time()-start_time:.2f}s")
                                first = False
                            if gen_id[0] != my_id or not state_flag[0]:
                                logger.info(f"Thread {my_id} aborted.")
                                break
                            if not sentence.strip(): continue
                            import re
                            clean = re.sub(r'^[a-zA-Z0-9_ -]+:\s*', '', sentence).strip()
                            if not clean: continue

                            ai_voice = "ife_target.wav"
                            chunk_wav = os.path.join(SHOWS_DIR, f"fragment_{uuid.uuid4().hex[:8]}.wav")
                            try:
                                t0 = time.time()
                                generate_line_audio_sync(clean, ai_voice, chunk_wav, is_interactive=True)
                                logger.info(f"Thread {my_id} TTS done in {time.time()-t0:.2f}s")
                                if not state_flag[0] or gen_id[0] != my_id: break
                                
                                # Instantly route to the caller's speakers via WebSocket (zero-latency)
                                with open(chunk_wav, "rb") as f:
                                    main_loop.call_soon_threadsafe(audio_out_queue.put_nowait, f.read())
                                    
                                # Standard route to the radio broadcast stream (Icecast 25s latency)
                                push_to_liquidsoap_sync(chunk_wav, queue_name="interactive_api")
                            except Exception as e:
                                logger.error(f"TTS chunk failed: {e}")
                    except Exception as e:
                        logger.error(f"consume_stream crash: {e}")

                t = asyncio.create_task(asyncio.to_thread(consume_stream, pending_text, call_active, generation_id, my_id))
                t.add_done_callback(lambda task: logger.error(f"Task error: {task.exception()}") if not task.cancelled() and task.exception() else None)

    except WebSocketDisconnect:
        call_active[0] = False
        skip_liquidsoap_track()
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            manager.disconnect(websocket)
        except:
            pass

