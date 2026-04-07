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
        transcript_buffer = []
        # Rolling WebM chunk buffer.
        # MediaRecorder emits a stream: chunk[0] has EBML headers + first audio cluster,
        # chunk[1,2,...] have only audio cluster data (no headers).
        # We keep ALL chunks so the combined bytes form a complete decodable WebM file.
        # After flushing to the LLM, we reset to [chunk[0]] to keep the headers for next utterance.
        webm_chunks: list[bytes] = []
        # After dispatching to LLM, ignore STT for a few seconds.
        # The rolling buffer always retranscribes the previous utterance
        # from chunk[0] — without this cooldown, it fires duplicate LLM calls.
        stt_cooldown_until = 0.0

        # Reset AI memory so every new caller gets a fresh greeting.
        llm_generate.reset_conversation()

        while True:
            # 1. Receive WebM audio chunks (~2s each from browser MediaRecorder)
            data = await websocket.receive_bytes()
            if not data:
                continue

            # Push chunk into rolling buffer (always keep first chunk for WebM headers)
            webm_chunks.append(data)
            if len(webm_chunks) > 8:
                webm_chunks = [webm_chunks[0]] + webm_chunks[-7:]

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

            # 2. STT — skip during cooldown to avoid retranscribing old audio
            pending_text = None
            now = time.time()

            if now < stt_cooldown_until:
                # In cooldown: keep accumulating chunks for headers but don't STT
                pass
            else:
                stt_input = b"".join(webm_chunks)
                transcript = stt_service.transcribe_audio_chunk(stt_input)

                # 3. Debounce logic
                if transcript and len(transcript.strip()) >= 2:
                    # Speech detected — buffer it (deduplicated)
                    if not transcript_buffer or transcript_buffer[-1] != transcript:
                        transcript_buffer.append(transcript)
                        logger.info(f"[CALLER INPUT]: {transcript}")
                        await websocket.send_text(f"STT: {transcript}")
                else:
                    # Silence — flush buffer to LLM
                    if transcript_buffer:
                        pending_text = " ".join(transcript_buffer)
                        transcript_buffer = []
                        webm_chunks = [webm_chunks[0]]
                    else:
                        if len(webm_chunks) > 2:
                            webm_chunks = [webm_chunks[0]]

                # Force flush after 3 consecutive speech chunks
                if len(transcript_buffer) >= 3:
                    pending_text = " ".join(transcript_buffer)
                    transcript_buffer = []
                    webm_chunks = [webm_chunks[0]]

            # NOTE: Caller audio is intentionally NOT pushed to Liquidsoap.
            # Previously every 2s chunk was queued, creating a 30-50s backlog
            # of caller audio ahead of the AI response in the playback queue.

            # 4. Fire LLM → edge-TTS → WebSocket if we have flushed text
            if pending_text:
                logger.info(f"[DISPATCH TO LLM]: '{pending_text}'")
                # Cooldown: ignore STT for 3s so old audio isn't retranscribed into another dispatch
                stt_cooldown_until = time.time() + 3.0
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
                                with open(chunk_wav, "rb") as f:
                                    asyncio.run_coroutine_threadsafe(websocket.send_bytes(f.read()), main_loop)
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

