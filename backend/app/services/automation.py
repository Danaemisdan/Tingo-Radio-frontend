"""
Radio Automation Service — Shows & Ads ONLY mode.
No music. Continuous: [Show Segment] → [Ad] → [Show Segment] → [Ad] → ...
Zero gaps, zero crashes, maximum variety.
"""
import os
import time
import subprocess
import threading
import logging
import random
import json
from datetime import datetime
from .show_generator import show_generator
from .ad_agent import get_next_ad, generate_ad_sync, load_ads, start_ad_pregenerator
from .chat_agent import get_next_song_request, generate_song_request_response_sync

logger = logging.getLogger(__name__)

SHOWS_JSON_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../shows.json"))

def load_shows() -> list:
    if not os.path.exists(SHOWS_JSON_PATH):
        logger.error("shows.json not found — using fallback show")
        return [{
            "show_name": "Tingo AI Radio",
            "concept": "Live AI radio with real talk, banter, and African culture.",
            "host1_name": "Ife",
            "host2_name": "Dozy",
            "start_time": "00:00",
            "end_time": "23:59",
            "topics": ["African identity", "The future of technology", "Life in Lagos"]
        }]
    try:
        with open(SHOWS_JSON_PATH, "r") as f:
            shows = json.load(f)
        return shows if shows else []
    except Exception as e:
        logger.error(f"Error reading shows.json: {e}")
        return []

import pytz

def get_current_show(shows: list) -> dict:
    """Pick the show scheduled for Nigerian time. Falls back to random."""
    try:
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
    except Exception as e:
        logger.warning(f"get_current_show error: {e}")
    return random.choice(shows) if shows else {}

def get_audio_duration(file_path: str) -> float:
    """Returns duration in seconds. Falls back to 120s."""
    try:
        from pydub import AudioSegment
        return len(AudioSegment.from_file(file_path)) / 1000.0
    except Exception:
        try:
            result = subprocess.run(
                ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
                 "-of", "csv=p=0", file_path],
                capture_output=True, text=True, timeout=10
            )
            val = result.stdout.strip()
            return float(val) if val else 120.0
        except Exception:
            return 120.0

def push_to_liquidsoap_sync(file_path: str) -> bool:
    """Push a file to Liquidsoap queue. Returns True on success."""
    try:
        abs_path = os.path.abspath(file_path)
        if not os.path.exists(abs_path):
            logger.error(f"File does not exist, cannot push: {abs_path}")
            return False
        command = f"show_api.push {abs_path}\n"
        result = subprocess.run(
            ["nc", "-w", "3", "127.0.0.1", "1234"],
            input=command, capture_output=True, text=True, timeout=10
        )
        logger.info(f"Pushed: {os.path.basename(abs_path)} → {result.stdout.strip()}")
        return True
    except Exception as e:
        logger.error(f"Failed to push to Liquidsoap: {e}")
        return False

def _wait(seconds: float, stop_event: threading.Event, label: str = "") -> None:
    """Wait for `seconds`, stopping early if stop_event is set."""
    seconds = max(0.0, float(seconds))
    logger.info(f"⏱  Waiting {seconds:.0f}s for '{label}'...")
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if stop_event.is_set():
            return
        time.sleep(min(1.0, deadline - time.monotonic()))

from app.api.interactive import get_next_audience_interaction

def transcribe_audio(file_path: str) -> str:
    try:
        from pydub import AudioSegment
        import speech_recognition as sr
        audio = AudioSegment.from_file(file_path)
        wav_path = file_path + ".wav"
        audio.export(wav_path, format="wav")
        recognizer = sr.Recognizer()
        with sr.AudioFile(wav_path) as source:
            data = recognizer.record(source)
            text = recognizer.recognize_google(data)
        os.remove(wav_path)
        return text
    except Exception as e:
        logger.warning(f"Transcription failed: {e}")
        return "I love your show, Tingo AI Radio!"

def _get_unique_topic(show: dict, used: dict) -> str:
    """Pick a topic that hasn't been used yet for this show, cycling when exhausted."""
    sname = show.get("show_name", "default")
    topics = show.get("topics", ["African culture and life"])
    if sname not in used or len(used[sname]) >= len(topics):
        used[sname] = []
    remaining = [t for t in topics if t not in used[sname]]
    if not remaining:
        remaining = topics
        used[sname] = []
    topic = random.choice(remaining)
    used[sname].append(topic)
    return topic

def _generate_show(shows: list, last_show: dict, used_topics: dict,
                   seg_counter: int, stop_event: threading.Event) -> tuple[str, dict]:
    """Generate one show segment. Returns (audio_path, show_used). Empty string on failure."""
    # Always pick a DIFFERENT show than the last one for variety
    available = [s for s in shows if s.get("show_name") != last_show.get("show_name")] or shows
    show = random.choice(available)

    topic = _get_unique_topic(show, used_topics)
    prompt_modifier = f"The topic for this segment is: '{topic}'. "

    # Audience interactions
    try:
        interaction = get_next_audience_interaction()
        if interaction:
            if interaction["type"] == "call":
                transcript = transcribe_audio(interaction["audio_path"])
                prompt_modifier += f"\n\nCRITICAL: A listener called in and said: '{transcript}'. Respond directly to them personally!"
            else:
                prompt_modifier += f"\n\nCRITICAL: Live chat from listener: '{interaction['text']}'. Read it on air and respond warmly!"
    except Exception as e:
        logger.warning(f"Interaction fetch failed (skipping): {e}")
        interaction = None

    # Live news injection
    try:
        from .news_scraper import scrape_live_news
        news = scrape_live_news(topic)
        if news:
            prompt_modifier += news
    except Exception as e:
        logger.warning(f"News scrape failed (skipping): {e}")

    output_name = f"show_segment_{seg_counter}.mp3"
    logger.info(f"🎙  Generating: '{show['show_name']}' – topic: '{topic}'")

    audio_path = ""
    try:
        audio_path = show_generator.generate_show_segment_sync(show, prompt_modifier, output_name)
    except Exception as e:
        logger.error(f"show_generator failed: {e}", exc_info=True)
        return "", show

    # Push caller audio if applicable
    if interaction and interaction.get("type") == "call":
        try:
            raw = interaction["audio_path"]
            converted = raw.replace(".webm", ".mp3")
            if raw.endswith(".webm"):
                subprocess.run(
                    ["ffmpeg", "-i", raw, "-acodec", "libmp3lame", "-y", converted],
                    check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
                )
                push_to_liquidsoap_sync(converted)
                _wait(get_audio_duration(converted), stop_event, "caller audio")
            else:
                push_to_liquidsoap_sync(raw)
                _wait(get_audio_duration(raw), stop_event, "caller audio")
        except Exception as e:
            logger.warning(f"Caller audio push failed: {e}")

    return audio_path, show

def _try_push_ad(stop_event: threading.Event) -> None:
    """Push the next available ad. Generates one if none pre-generated."""
    try:
        ad = get_next_ad()
        if ad and os.path.exists(ad["path"]):
            logger.info(f"📢 Ad break: {ad['brand']}")
            if push_to_liquidsoap_sync(ad["path"]):
                _wait(get_audio_duration(ad["path"]), stop_event, f"ad:{ad['brand']}")
            return
        # No pre-generated ad — generate one
        ads_config = load_ads()
        if ads_config:
            ad_entry = random.choice(ads_config)
            ad_path = generate_ad_sync(ad_entry)
            if ad_path and os.path.exists(ad_path):
                logger.info(f"📢 Generated ad: {ad_entry.get('brand', 'unknown')}")
                if push_to_liquidsoap_sync(ad_path):
                    _wait(get_audio_duration(ad_path), stop_event, "generated ad")
    except Exception as e:
        logger.error(f"Ad push failed (skipping): {e}")

SHOWS_PER_AD = 1  # Ad break after every show segment

def _automation_loop_sync(stop_event: threading.Event) -> None:
    """
    SHOWS-ONLY continuous loop:
      [Show Segment] → wait → [Ad] → wait → [Show Segment] → wait → ...

    Zero music. Zero gaps. Zero crashes.
    Every show is different from the previous one.
    Every topic is unique until all are exhausted, then cycles.
    """
    seg_counter = 0
    shows_since_ad = 0
    used_topics: dict = {}
    last_show: dict = {}
    consecutive_failures = 0
    MAX_CONSECUTIVE_FAILURES = 5

    logger.info("🎙  Automation loop started — SHOWS ONLY mode (Ife & Dozy)")

    while not stop_event.is_set():
        try:
            shows = load_shows()
            if not shows:
                logger.error("No shows loaded — waiting 30s")
                _wait(30, stop_event, "waiting for shows")
                continue

            seg_counter += 1
            audio_path, last_show = _generate_show(
                shows, last_show, used_topics, seg_counter, stop_event
            )

            if not audio_path or not os.path.exists(audio_path):
                consecutive_failures += 1
                logger.error(f"Show generation failed ({consecutive_failures}/{MAX_CONSECUTIVE_FAILURES})")
                if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                    logger.critical("Too many consecutive failures — sleeping 60s to recover")
                    _wait(60, stop_event, "crash recovery pause")
                    consecutive_failures = 0
                else:
                    _wait(10, stop_event, "retry delay")
                continue

            consecutive_failures = 0  # Reset on success

            if push_to_liquidsoap_sync(audio_path):
                dur = get_audio_duration(audio_path)
                logger.info(f"▶ Show segment {seg_counter} playing ({dur:.0f}s)")
                _wait(dur, stop_event, f"show segment {seg_counter}")

            # Ad break
            shows_since_ad += 1
            if shows_since_ad >= SHOWS_PER_AD:
                shows_since_ad = 0
                _try_push_ad(stop_event)

        except Exception as e:
            consecutive_failures += 1
            logger.error(f"Unhandled error in automation loop: {e}", exc_info=True)
            _wait(15, stop_event, "error recovery")


class RadioAutomationService:
    def __init__(self):
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            logger.info("Automation already running.")
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True, name="RadioAutomation")
        self._thread.start()
        logger.info("Radio Automation started — SHOWS+ADS ONLY mode (Ife & Dozy)")

    def stop(self) -> None:
        self._stop_event.set()
        logger.info("Radio Automation stop signal sent.")

    def _run_loop(self) -> None:
        _automation_loop_sync(self._stop_event)

    async def push_to_liquidsoap(self, file_path: str) -> None:
        push_to_liquidsoap_sync(file_path)


automation_service = RadioAutomationService()
