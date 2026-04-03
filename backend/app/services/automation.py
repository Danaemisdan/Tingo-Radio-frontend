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

def push_to_liquidsoap_sync(file_path: str):
    """Synchronous nc telnet push."""
    try:
        abs_path = os.path.abspath(file_path)
        command = f"show_api.push {abs_path}\n"
        result = subprocess.run(
            ["nc", "-w", "3", "127.0.0.1", "1234"],
            input=command,
            capture_output=True,
            text=True,
            timeout=10
        )
        logger.info(f"Liquidsoap push: {abs_path} → {result.stdout.strip()}")
    except Exception as e:
        logger.error(f"Failed to push {file_path} to Liquidsoap: {e}")

def _wait_for_overlap(duration: float, stop_event: threading.Event, label: str = ""):
    """
    Wait for the FULL audio duration before returning.
    This ensures shows and songs always finish fully before the next item is queued.
    Previously this had a -15s 'overlap' trick but that caused songs to interrupt shows.
    """
    wait_time = max(1, duration)
    logger.info(f"⏱  Waiting {wait_time:.0f}s for '{label}' to finish ...")
    for _ in range(int(wait_time)):
        if stop_event.is_set():
            return
        time.sleep(1)

import speech_recognition as sr
from pydub import AudioSegment
from app.api.interactive import get_next_audience_interaction

def transcribe_audio(file_path: str) -> str:
    """Converts webm audio to text using Google STT."""
    try:
        audio = AudioSegment.from_file(file_path)
        wav_path = file_path + ".wav"
        audio.export(wav_path, format="wav")
        recognizer = sr.Recognizer()
        with sr.AudioFile(wav_path) as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data)
        os.remove(wav_path)
        return text
    except Exception as e:
        logger.error(f"Failed to transcribe audio: {e}")
        return "I love your show, Tingo AI Radio!"

# --- MIXED FORMAT: SONGS, SHOWS, ADS ---
SONGS_PER_SHOW = 2
SHOWS_PER_AD = 1

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
            shows = load_shows()
            if not shows:
                time.sleep(10)
                continue

            current_show = get_current_show(shows)
            host1 = current_show.get("host1_name", "Ife")
            host2 = current_show.get("host2_name", "Dozy")
            sname = current_show.get("show_name", "Morning Action")

            # Default state: assume music until we explicitly enter a show block
            # This ensures the Call In button is only green DURING actual show segments
            _radio_state["is_show_live"] = False
            _radio_state["current_segment"] = "music"

            # ── 0. FAST-TRACK INTERACTIVE BLOCK ─────────────────────────────
            # High priority: If a user texted or called, respond IMMEDIATELY
            interaction = get_next_audience_interaction()
            if interaction:
                caller_text = ""
                if interaction["type"] == "call":
                    raw_path = interaction["audio_path"]
                    # Transcribe SILENTLY first — don't put raw caller audio on the stream
                    # The OAPs will respond to what the caller said, that's what goes on air
                    caller_text = transcribe_audio(raw_path)
                    if not caller_text:
                        caller_text = "Hey, just checking in!"
                else:
                    caller_text = interaction["text"]

                if caller_text:
                    _radio_state["is_show_live"] = True  # Show is live during interactive response
                    _radio_state["current_segment"] = "interactive"
                    output_name = f"int_resp_{int(time.time())}.mp3"
                    ai_audio_path = show_generator.generate_interactive_segment_sync(caller_text, current_show, output_name)

                    if ai_audio_path:
                        push_to_liquidsoap_sync(ai_audio_path)
                        _wait_for_overlap(get_audio_duration(ai_audio_path), stop_event, "interactive response")

            # Loop back to check for more interactions before playing music
                continue

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
                        _wait_for_overlap(get_audio_duration(intro_path), stop_event, f"intro for {song_name}")
                    
                    # Push actual song
                    push_to_liquidsoap_sync(song_path)
                    song_dur = get_audio_duration(song_path)
                    _wait_for_overlap(song_dur, stop_event, f"song {song_name}")
                    
                    songs_since_last_show += 1
                    continue # Loop back to play next song or drop into show

            # Reset song counter once we drop into a show
            songs_since_last_show = 0

            # ── 2. SHOW BLOCK ─────────────────────────────────────────
            _radio_state["is_show_live"] = True
            _radio_state["current_show_name"] = sname
            _radio_state["current_segment"] = "show"
            topics = current_show.get("topics", ["Insane energy in Africa right now!"])
            if sname not in _used_topics or len(_used_topics[sname]) >= len(topics):
                _used_topics[sname] = []
            remaining = [t for t in topics if t not in _used_topics[sname]]
            base_topic = random.choice(remaining)
            _used_topics[sname].append(base_topic)

            prompt_modifier = f"The general topic is: {base_topic}. "

            from .news_scraper import scrape_live_news
            live_news = scrape_live_news(base_topic)
            if live_news:
                prompt_modifier += "\\nAnd discuss this breaking news casually: " + live_news

            show_segment_counter += 1
            output_name = f"show_segment_{show_segment_counter}.mp3"
            logger.info(f"Generating Show: {current_show['show_name']} #{show_segment_counter}")
            
            ai_audio_path = show_generator.generate_show_segment_sync(current_show, prompt_modifier, output_name)

            if ai_audio_path:
                push_to_liquidsoap_sync(ai_audio_path)
                seg_dur = get_audio_duration(ai_audio_path)
                logger.info(f"▶ Queued Show {show_segment_counter} ({seg_dur:.0f}s). Overlapping next gen...")
                _wait_for_overlap(seg_dur, stop_event, f"show {show_segment_counter}")

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
