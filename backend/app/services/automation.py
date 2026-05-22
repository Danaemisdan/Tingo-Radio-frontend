"""
Radio Automation Service
Fully synchronous - runs the show generation loop in a daemon thread.
No asyncio in the critical path. LLM (requests.post) and TTS (subprocess) are blocking I/O.

KEY DESIGN: TALK RADIO ONLY. No music played. Just show segments and ads back-to-back.
Wait logic is overlap-based: we wait (duration - 15) seconds to generate the NEXT item
while the current one is still playing, ensuring ZERO dead air when Liquidsoap transitions.
"""
import os
import time
import subprocess
import threading
import logging
import random
from .show_generator import show_generator
from .ad_agent import get_next_ad, generate_ad_sync, load_ads, start_ad_pregenerator
from .chat_agent import get_next_song_request, process_message_for_song_request, generate_song_request_response_sync

logger = logging.getLogger(__name__)

import json
from datetime import datetime

# ── Global radio state (read by /api/status endpoint) ─────────────────────────
_radio_state = {
    "is_show_live": False,
    "current_show_name": "",
    "current_segment": "music"  # "music" | "show" | "ad"
}

def get_radio_status() -> dict:
    return _radio_state.copy()

SHOWS_JSON_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../shows.json"))

def load_shows():
    if not os.path.exists(SHOWS_JSON_PATH):
        logger.error("shows.json not found! Creating default...")
        default_shows = [
            {
                "show_name": "Tingo Morning Adrenaline",
                "concept": "The absolute most energetic, high-octane morning show alive. Non-stop hype, incredible debates, crazy energy.",
                "host1_name": "Ife",
                "host2_name": "Dozy",
                "start_time": "00:00",
                "end_time": "23:59",
                "topics": ["Artificial Intelligence", "Future of Africa"]
            }
        ]
        with open(SHOWS_JSON_PATH, "w") as f:
            json.dump(default_shows, f, indent=4)
        return default_shows

    with open(SHOWS_JSON_PATH, "r") as f:
        try:
            return json.load(f)
        except Exception as e:
            logger.error(f"Error reading shows.json: {e}")
            return []

import pytz

def get_current_show(shows: list) -> dict:
    """Finds the actively scheduled show based on Nigerian Time (WAT)."""
    tz = pytz.timezone("Africa/Lagos")
    now_str = datetime.now(tz).strftime("%H:%M")
    for show in shows:
        start = show.get("start_time", "00:00")
        end = show.get("end_time", "23:59")
        if start <= end:
            if start <= now_str <= end:
                return show
        else:
            if now_str >= start or now_str <= end:
                return show
    return random.choice(shows) if shows else {}

def get_audio_duration(file_path: str) -> float:
    """Returns duration of an audio file in seconds. Falls back to 180s if unreadable."""
    try:
        from pydub import AudioSegment
        audio = AudioSegment.from_file(file_path)
        return len(audio) / 1000.0
    except Exception:
        try:
            result = subprocess.run(
                ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
                 "-of", "csv=p=0", file_path],
                capture_output=True, text=True, timeout=10
            )
            return float(result.stdout.strip())
        except Exception:
            return 180.0  # Assume 3 minutes as fallback

def push_to_liquidsoap_sync(file_path: str, queue_name: str = "show_api"):
    """Synchronous nc telnet push."""
    try:
        abs_path = os.path.abspath(file_path)
        command = f"{queue_name}.push {abs_path}\n"
        result = subprocess.run(
            ["nc", "-w", "3", "127.0.0.1", "1234"],
            input=command,
            capture_output=True,
            text=True,
            timeout=10
        )
        logger.info(f"Liquidsoap push ({queue_name}): {abs_path} → {result.stdout.strip()}")
    except Exception as e:
        logger.error(f"Failed to push {file_path} to Liquidsoap: {e}")

def skip_liquidsoap_track():
    """Flushes BOTH queues so music and shows stop instantly on caller interrupt."""
    try:
        # Skip whatever is currently playing in the show queue
        subprocess.run(["nc", "-w", "1", "127.0.0.1", "1234"], input=b"show_api.skip\n", capture_output=True)
    except: pass
    try:
        # Clear the interactive queue too in case of stale chunks from last session
        subprocess.run(["nc", "-w", "1", "127.0.0.1", "1234"], input=b"interactive_api.flush\n", capture_output=True)
    except: pass

class CallerInterruptedException(Exception):
    def __init__(self, interaction):
        self.interaction = interaction

def _wait_for_overlap(duration: float, stop_event: threading.Event, label: str = ""):
    """
    Waits (duration - 40)s so the next generator starts 40s before this track ends.
    Used for show segments so generation of the next one overlaps with the tail of this one.
    """
    wait_time = max(1, duration - 40)
    logger.info(f"⏱  Waiting {wait_time:.0f}s for '{label}'... (-40s pre-buffer overlap)")
    for _ in range(int(wait_time)):
        if stop_event.is_set():
            return
        if _radio_state.get("current_segment") == "interactive":
            raise CallerInterruptedException({"type": "live_caller_override"})
        interaction = get_next_audience_interaction()
        if interaction:
            raise CallerInterruptedException(interaction)
        time.sleep(1)

def _wait_full(duration: float, stop_event: threading.Event, label: str = ""):
    """
    Waits the FULL track duration (minus 3s crossfade buffer).
    Used for songs so they always play completely before the next segment starts.
    """
    wait_time = max(1, duration - 3)
    logger.info(f"⏱  Song wait: {wait_time:.0f}s for '{label}' (plays to end)")
    for _ in range(int(wait_time)):
        if stop_event.is_set():
            return
        # Callers can still interrupt even during songs
        if _radio_state.get("current_segment") == "interactive":
            raise CallerInterruptedException({"type": "live_caller_override"})
        interaction = get_next_audience_interaction()
        if interaction:
            raise CallerInterruptedException(interaction)
        time.sleep(1)

from pydub import AudioSegment
from app.api.interactive import get_next_audience_interaction

def transcribe_audio(file_path: str) -> str:
    """Converts webm/mp4 audio to text using local faster-whisper (offline, no API key needed)."""
    try:
        from app.services.stt import stt_service
        audio = AudioSegment.from_file(file_path)
        wav_path = file_path + ".wav"
        audio.export(wav_path, format="wav", parameters=["-ar", "16000", "-ac", "1"])
        with open(wav_path, "rb") as f:
            audio_bytes = f.read()
        os.remove(wav_path)
        text = stt_service.transcribe_audio_chunk(audio_bytes)
        logger.info(f"Transcribed caller audio: '{text[:60]}'")
        return text
    except Exception as e:
        logger.error(f"Failed to transcribe audio: {e}")
        return ""

# ── Show block: keep generating segments until this many seconds of show are queued ──
SHOW_BLOCK_TARGET_SECONDS = 660   # ~11 minutes of show content per block
SHOWS_PER_AD = 1                  # Ad break after every show block
SONGS_PER_SHOW = 3                # Songs between show blocks

MUSIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../media/music"))

# Shuffle queue — guarantees zero repeats until every song has played once
_song_queue: list = []

def get_random_song() -> str:
    """Returns songs in shuffled order with zero repeats until the full library cycles."""
    global _song_queue
    try:
        if not os.path.exists(MUSIC_DIR):
            return ""
        all_songs = [f for f in os.listdir(MUSIC_DIR) if f.endswith(".mp3")]
        if not all_songs:
            return ""
        # Refill and reshuffle only when queue is empty
        if not _song_queue:
            _song_queue = all_songs[:]
            random.shuffle(_song_queue)
            logger.info(f"🎵 Song queue refilled and reshuffled: {len(_song_queue)} tracks")
        return os.path.join(MUSIC_DIR, _song_queue.pop())
    except Exception as e:
        logger.error(f"Error reading music dir: {e}")
        return ""


def _automation_loop_sync(stop_event: threading.Event):
    """
    MIXED RADIO FORMAT:
      [Song Intro > Song] (x SONGS_PER_SHOW) → [Show Segment] → [Ad] → repeat
    """
    show_segment_counter = 0
    shows_since_last_ad = 0
    songs_since_last_show = 0
    _used_topics: dict = {}
    current_show = {}

    while not stop_event.is_set():
        try:
            # If a human is actively on a call, entirely freeze the background automated generator
            # so it NEVER steals the LLM lock from the live caller!
            if _radio_state.get("current_segment") == "interactive":
                time.sleep(2)
                continue

            shows = load_shows()
            if not shows:
                time.sleep(10)
                continue

            current_show = get_current_show(shows)
            host1 = current_show.get("host1_name", "Ife")
            host2 = current_show.get("host2_name", "Dozy")
            sname = current_show.get("show_name", "Morning Action")

            # The user explicitly wants to be able to call in even during a song block
            # So the Call In button must ALWAYS be active for the interactive override.
            _radio_state["is_show_live"] = True
            _radio_state["current_segment"] = "music"
            
            # (Interactions are now polled purely inside `_wait_for_overlap` so we don't accidentally check twice and duplicate)
            
            # ── 1. SONG BLOCK ─────────────────────────────────────────
            # Man vs Machine is purely a talk/caller show — zero music interruptions
            songs_limit = 0 if "Man vs Machine" in sname else SONGS_PER_SHOW

            if songs_since_last_show < songs_limit:
                _radio_state["is_show_live"] = False
                _radio_state["current_segment"] = "music"
                song_path = get_random_song()
                if song_path:
                    song_name = os.path.basename(song_path).replace(".mp3", "")
                    logger.info(f"▶ Queuing Song: {song_name}")
                    
                    # Generate natural intro for the song
                    intro_prompt = f"Write a very quick, extremely natural 10-second intro for the track '{song_name}'. Ignore any 'Official Video' or 'Lyric Video' tags in the name, just say the artist and song naturally. {host1} and {host2} should just vibe for a few seconds before throwing to the track. KEEP IT SHORT."
                    output_name = f"intro_{int(time.time())}.mp3"
                    intro_path = show_generator.generate_show_segment_sync(current_show, intro_prompt, output_name)
                    
                    if intro_path:
                        push_to_liquidsoap_sync(intro_path)
                        intro_dur = get_audio_duration(intro_path)
                        # Intro is short (~10-15s) — wait the full duration
                        _wait_full(intro_dur, stop_event, f"intro for {song_name}")

                    # Push song and wait for it to play to completion.
                    push_to_liquidsoap_sync(song_path)
                    song_dur = get_audio_duration(song_path)
                    logger.info(f"▶ Song '{song_name}' ({song_dur:.0f}s) — playing to end")
                    _wait_full(song_dur, stop_event, f"song: {song_name}")

                    songs_since_last_show += 1
                    continue

            # Reset song counter once we drop into a show
            songs_since_last_show = 0

            # ── 2. SHOW BLOCK (10+ minutes) ─────────────────────────────────────
            # Generate 3-minute segments back-to-back until we've queued 11 minutes.
            _radio_state["is_show_live"] = True
            _radio_state["current_show_name"] = sname
            _radio_state["current_segment"] = "show"

            topics = current_show.get("topics", ["Insane energy in Africa right now!"])
            if sname not in _used_topics or len(_used_topics[sname]) >= len(topics):
                _used_topics[sname] = []

            show_block_queued_seconds = 0
            segment_index = 0

            while show_block_queued_seconds < SHOW_BLOCK_TARGET_SECONDS:
                if stop_event.is_set():
                    break
                if _radio_state.get("current_segment") == "interactive":
                    break

                # Rotate topics so each segment covers something different
                remaining = [t for t in topics if t not in _used_topics[sname]]
                if not remaining:
                    _used_topics[sname] = []
                    remaining = topics[:]
                base_topic = random.choice(remaining)
                _used_topics[sname].append(base_topic)

                prompt_modifier = f"The general topic is: {base_topic}. "
                from .news_scraper import scrape_live_news
                live_news = scrape_live_news(base_topic)
                if live_news:
                    prompt_modifier += "\nAnd weave in this breaking news casually: " + live_news

                show_segment_counter += 1
                segment_index += 1
                output_name = f"show_segment_{show_segment_counter}.mp3"
                logger.info(f"Generating Show Block Segment {segment_index} for [{sname}] "
                            f"({show_block_queued_seconds:.0f}s of {SHOW_BLOCK_TARGET_SECONDS}s done)")

                # Generation (interruptible)
                ai_audio_path = None
                from concurrent.futures import ThreadPoolExecutor
                executor = ThreadPoolExecutor(max_workers=1)
                future = executor.submit(
                    show_generator.generate_show_segment_sync,
                    current_show, prompt_modifier, output_name
                )
                while not future.done() and not stop_event.is_set():
                    interaction = get_next_audience_interaction()
                    if interaction:
                        executor.shutdown(wait=False)
                        raise CallerInterruptedException(interaction)
                    time.sleep(1)

                if not stop_event.is_set():
                    ai_audio_path = future.result()
                executor.shutdown(wait=False)

                if ai_audio_path:
                    push_to_liquidsoap_sync(ai_audio_path)
                    seg_dur = get_audio_duration(ai_audio_path)
                    show_block_queued_seconds += seg_dur
                    logger.info(f"▶ Queued Show Segment {segment_index} ({seg_dur:.0f}s). "
                                f"Block total: {show_block_queued_seconds:.0f}s / {SHOW_BLOCK_TARGET_SECONDS}s")

                    # If more segments needed, start generating next while this one plays
                    if show_block_queued_seconds < SHOW_BLOCK_TARGET_SECONDS:
                        # Wait most of this segment so queue stays fed, then generate next
                        _wait_for_overlap(seg_dur, stop_event, f"show segment {segment_index}")
                    else:
                        # Last segment — wait full duration so songs don't overlap with show
                        full_wait = max(1, seg_dur - 5)
                        logger.info(f"⏳ Show block complete ({show_block_queued_seconds:.0f}s). Waiting for last segment...")
                        _wait_for_overlap(full_wait, stop_event, f"show block final segment")

            # ── 2.5. THE FUTURE IN A MINUTE ───────────────────────────
            # Airs once at each daypart boundary (9h, 12h, 14h, 17h, 20h, 23h WAT).
            # Single-narrator 45-75s feature using a real live news story.
            try:
                from .future_in_a_minute import should_air_now, generate_future_in_a_minute_sync
                if should_air_now():
                    logger.info("🔮 Daypart boundary — generating 'The Future In A Minute'...")
                    _radio_state["current_segment"] = "feature"
                    fim_path = generate_future_in_a_minute_sync()
                    if fim_path:
                        push_to_liquidsoap_sync(fim_path)
                        fim_dur = get_audio_duration(fim_path)
                        logger.info(f"▶ 'The Future In A Minute' on air ({fim_dur:.0f}s)")
                        _wait_for_overlap(fim_dur, stop_event, "Future In A Minute")
                    _radio_state["current_segment"] = "show"
            except Exception as fim_err:
                logger.error(f"'The Future In A Minute' failed — skipping: {fim_err}")

            # ── 3. AD BREAK ───────────────────────────────────────────
            shows_since_last_ad += 1
            if shows_since_last_ad >= SHOWS_PER_AD:
                shows_since_last_ad = 0
                ad = get_next_ad()
                if ad:
                    logger.info(f"[Ad] {ad['brand']}")
                    push_to_liquidsoap_sync(ad["path"])
                    _wait_for_overlap(get_audio_duration(ad["path"]), stop_event, f"ad: {ad['brand']}")
                else:
                    all_ads = load_ads()
                    if all_ads:
                        ad_path = generate_ad_sync(all_ads[0])
                        if ad_path:
                            push_to_liquidsoap_sync(ad_path)
                            _wait_for_overlap(get_audio_duration(ad_path), stop_event, "generated ad")

        except CallerInterruptedException as e:
            logger.info("🚨 LIVE CALLER DETECTED! Intercepting flow...")
            _radio_state["is_show_live"] = True
            _radio_state["current_segment"] = "interactive"
            _radio_state["end_call_requested"] = False  # Reset flag on every new call

            # STEP 1: Kill everything currently playing immediately
            skip_liquidsoap_track()

            # STEP 2: Push silence ONLY to show_api to block the music fallback.
            # DO NOT push to interactive_api — that queue only carries real audio (caller + AI).
            # When interactive_api is empty during LLM gen, fallback → show_api (silence) not music.
            silence_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../media/silence_120s.wav"))
            def _push_silence_block():
                try:
                    if not os.path.exists(silence_path):
                        logger.info("Generating 120s silence file...")
                        from pydub import AudioSegment as _AS
                        _AS.silent(duration=120000).export(silence_path, format="wav")
                    push_to_liquidsoap_sync(silence_path, queue_name="show_api")
                    logger.info("✅ show_api silence refreshed — music blocked")
                except Exception as _se:
                    logger.warning(f"Could not push silence block: {_se}")
            _push_silence_block()

            interaction = e.interaction
            caller_text = ""

            if interaction["type"] == "call":
                raw_path = interaction["audio_path"]

                # Broadcast caller voice immediately on stream
                try:
                    from pydub import AudioSegment
                    audio = AudioSegment.from_file(raw_path)
                    caller_wav_path = raw_path + "_broadcast.wav"
                    audio.export(caller_wav_path, format="wav")
                    logger.info("Broadcasting raw caller voice!")
                    push_to_liquidsoap_sync(caller_wav_path, queue_name="interactive_api")
                except Exception as ex:
                    logger.error(f"Failed to prep caller audio for broadcast: {ex}")

                # Transcribe (local Whisper — fully offline)
                caller_text = transcribe_audio(raw_path)
                if not caller_text:
                    caller_text = "Hey, just checking in!"
            else:
                caller_text = interaction["text"]

            # STEP 3: Generate first AI response (no streaming — avoids LLM lock deadlock)
            logger.info(f"Generating AI response to caller: '{caller_text[:50]}'")
            try:
                output_filename = f"int_resp_{int(time.time())}.mp3"
                ai_audio_path = show_generator.generate_interactive_segment_sync(
                    caller_text, current_show, output_filename
                )
                if ai_audio_path and os.path.exists(ai_audio_path):
                    push_to_liquidsoap_sync(ai_audio_path, queue_name="interactive_api")
                    resp_dur = get_audio_duration(ai_audio_path)
                    logger.info(f"✅ AI response on air! Duration: {resp_dur:.1f}s")
                    time.sleep(max(0, resp_dur - 2))
                    # FLUSH OFF STALE CHUNKS HERE to prevent transcription backlog latency
                    import app.api.interactive as int_api
                    if "calls" in int_api.audience_queue:
                        int_api.audience_queue["calls"].clear()
                else:
                    logger.error("AI response generation failed — no audio produced")
            except Exception as ex:
                logger.error(f"Interactive response error: {ex}")

            def _do_farewell():
                logger.info("📞 Caller silent or limit hit — AI signing off")
                try:
                    fp = show_generator.generate_interactive_segment_sync(
                        "The caller has gone quiet or time is up. Wrap up warmly, thank them for calling Tingo AI Radio, and say you're heading back to the music.",
                        current_show,
                        f"farewell_{int(time.time())}.mp3"
                    )
                    if fp and os.path.exists(fp):
                        push_to_liquidsoap_sync(fp, queue_name="interactive_api")
                        time.sleep(max(0, get_audio_duration(fp) - 1))
                except Exception as ex:
                    logger.error(f"Auto-farewell failed: {ex}")

            # STEP 4: Timed call session loop.
            # Previous code broke immediately if the queue was empty — it never waited for
            # the caller's next 4-second chunk to arrive, so second responses never happened.
            # New code polls every 1s, refreshes silence every 90s, and auto-wraps after idle.
            CALL_IDLE_TIMEOUT = 30    # seconds with no new chunk → AI signs off
            MAX_CALL_DURATION = 180   # 3-minute hard cap
            call_start = time.time()
            last_chunk_time = time.time()
            silence_last_refreshed = time.time()
            GOODBYE_WORDS = [
                "bye", "goodbye", "later", "gotta go", "i'm done", "done now",
                "off now", "catch you", "thank you", "thanks", "that's all"
            ]

            logger.info("📞 Entered timed call session — polling for follow-up chunks...")
            while True:
                # Frontend pressed End Call
                if _radio_state.get("end_call_requested", False):
                    logger.info("📞 Frontend end-call received — exiting session")
                    break

                # 3-minute hard cap
                if time.time() - call_start > MAX_CALL_DURATION:
                    logger.info("📞 3-min call limit hit — auto-ending")
                    _do_farewell()
                    break

                # Refresh show_api silence every 90s (prevents music fallback)
                if time.time() - silence_last_refreshed > 90:
                    _push_silence_block()
                    silence_last_refreshed = time.time()

                next_chunk = get_next_audience_interaction()
                if next_chunk:
                    if next_chunk["type"] != "call":
                        break  # Text message, not audio — exit call mode

                    raw_path = next_chunk["audio_path"]
                    chunk_text = transcribe_audio(raw_path)
                    if not chunk_text:
                        time.sleep(1)
                        continue

                    last_chunk_time = time.time()
                    logger.info(f"📞 Follow-up chunk: '{chunk_text[:50]}'")
                    is_goodbye = any(w in chunk_text.lower() for w in GOODBYE_WORDS)

                    # Broadcast caller voice
                    try:
                        from pydub import AudioSegment
                        audio = AudioSegment.from_file(raw_path)
                        wav = raw_path + "_broadcast.wav"
                        audio.export(wav, format="wav")
                        push_to_liquidsoap_sync(wav, queue_name="interactive_api")
                    except Exception:
                        pass

                    # Generate AI reply (goodbye framing if detected)
                    prompt = chunk_text
                    if is_goodbye:
                        prompt = chunk_text + " [Caller is leaving — thank them energetically on air, say you're dropping a hot one for them]"

                    try:
                        out_name = f"int_resp_{int(time.time())}.mp3"
                        reply_path = show_generator.generate_interactive_segment_sync(
                            prompt, current_show, out_name
                        )
                        if reply_path and os.path.exists(reply_path):
                            push_to_liquidsoap_sync(reply_path, queue_name="interactive_api")
                            dur = get_audio_duration(reply_path)
                            time.sleep(max(0, dur - 2))
                            # FLUSH OFF STALE CHUNKS
                            import app.api.interactive as int_api
                            if "calls" in int_api.audience_queue:
                                int_api.audience_queue["calls"].clear()
                    except Exception as ex:
                        logger.error(f"Follow-up response error: {ex}")

                    if is_goodbye:
                        break  # Clean exit after farewell

                else:
                    # Queue empty — check idle timeout
                    idle_secs = time.time() - last_chunk_time
                    if idle_secs >= CALL_IDLE_TIMEOUT:
                        logger.info(f"📞 Caller silent {idle_secs:.0f}s — AI signing off")
                        _do_farewell()
                        break
                    time.sleep(1)

            logger.info("📞 Call session complete. Resuming normal broadcast.")
            _radio_state["end_call_requested"] = False
            from .llm import llm_generate
            llm_generate.reset_memory()
            songs_since_last_show = 0
            continue


        except Exception as e:
            logger.error(f"CRITICAL: Automation loop caught an exception but SURVIVED: {e}", exc_info=True)
            time.sleep(5)  # Don't spin fast if it's failing

class RadioAutomationService:
    def __init__(self):
        self._thread: threading.Thread = None
        self._stop_event = threading.Event()

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        logger.info("Radio Automation started.")

    def stop(self):
        self._stop_event.set()
        logger.info("Radio Automation stopped.")

    def _run_loop(self):
        _automation_loop_sync(self._stop_event)

    async def push_to_liquidsoap(self, file_path: str):
        push_to_liquidsoap_sync(file_path)

automation_service = RadioAutomationService()
