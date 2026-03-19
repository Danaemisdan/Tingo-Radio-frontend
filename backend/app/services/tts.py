"""
TTS Service - Uses the edge-tts CLI binary via subprocess.
This is 100% synchronous (no aiohttp, no asyncio) so it works
reliably from any thread or event loop context.
"""
import os
import re
import uuid
import asyncio
import logging
import subprocess
import random

logger = logging.getLogger(__name__)

SHOWS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../media/shows"))

import requests

VOICE_MAP = {
    # Main OAP Hosts
    "Ife": "ife_target.wav",
    "Dozy": "tingo_target.wav",

    # Legacy names mapped to same voices
    "Tingo": "tingo_target.wav",
    "TingoAI Max": "tingo_target.wav",
    "AdaAI": "ife_target.wav",
    "Tingo Civic AI": "tingo_target.wav",
    "Tingo Business AI": "tingo_target.wav",
    "Tingo Emotion AI": "ife_target.wav",
    "Tingo Sports AI": "tingo_target.wav",
    "Tingo Culture AI": "tingo_target.wav",
    "TingoGPT Tech": "tingo_target.wav",
    "Yaw": "tingo_target.wav",
    "Sheriff Quadry": "tingo_target.wav",
    "Fola Folayan": "ife_target.wav",
    "Chukwuemeka": "tingo_target.wav",
    "Caller": "ife_target.wav"
}

def parse_script(script_text: str) -> list[dict]:
    lines = script_text.strip().split('\n')
    parsed = []
    pattern = re.compile(r"^([^:]+):\s*(.*)$")
    for line in lines:
        match = pattern.match(line.strip())
        if match:
            speaker = match.group(1).strip()
            text = match.group(2).strip()
            if speaker and text:
                parsed.append({"speaker": speaker, "text": text})
    return parsed

def generate_line_audio_sync(text: str, voice: str, output_path: str):
    """
    Synthesize one line using local XTTS zero-shot cloning server.
    Preprocessing maximises naturalness and emotion.
    """
    import re

    # Strip ALL bracketed stage directions so Coqui doesn't pronounce them
    text = re.sub(r'\[.*?\]', '', text).strip()
    text = re.sub(r'\(.*?\)', '', text).strip()

    # Replace AI abbreviation with spoken form
    text = re.sub(r'\bAI\b', 'A I', text)
    text = re.sub(r'\bAi\b', 'A I', text)

    # Ellipsis → pause comma (more natural)
    text = text.replace("...", ", ")

    # Em-dash to comma pause
    text = text.replace(" — ", ", ")
    text = text.replace("—", ", ")

    # Strip asterisks (markdown bold) that might slip through from LLM
    text = text.replace("*", "")

    # Skip completely empty lines
    if not text.strip():
        return

    url = "http://localhost:8001/synthesize"
    payload = {
        "text": text,
        "speaker_wav": voice,
        "language": "en",
        "speed": 1.1,           # Slightly faster = more energetic on-air feel
    }

    import time
    max_retries = 60
    for attempt in range(max_retries):
        try:
            response = requests.post(url, json=payload, timeout=300)
            response.raise_for_status()
            with open(output_path, 'wb') as f:
                f.write(response.content)
            return
        except Exception as e:
            if attempt < max_retries - 1:
                logger.warning(f"XTTS server not ready (attempt {attempt+1}/{max_retries}): {e}. Retrying in 5s...")
                time.sleep(5)
            else:
                logger.error(f"XTTS server failed for voice {voice}: {e}")
                raise RuntimeError(f"XTTS synthesis failed after {max_retries} attempts: {e}")


def synthesize_show_sync(script_text: str, output_filename: str) -> str:
    """
    Full synchronous show synthesis: parse script → TTS per line → ffmpeg concat → ducked bg beat.
    """
    parsed_lines = parse_script(script_text)
    if not parsed_lines:
        logger.error("No valid lines found in script.")
        return ""

    job_id = uuid.uuid4().hex[:8]
    temp_files = []

    try:
        os.makedirs(SHOWS_DIR, exist_ok=True)

        for i, line in enumerate(parsed_lines):
            speaker = line['speaker']
            text = line['text']
            if not text.strip():
                continue

            # Ife = female voice, Dozy + everything else = male voice
            sl = speaker.lower()
            if sl in ("ife",) or "fola" in sl or "ada" in sl or "emotion" in sl:
                voice = "ife_target.wav"
            else:
                voice = "tingo_target.wav"

            temp_file = os.path.join(SHOWS_DIR, f"tmp_{job_id}_{i}.wav")
            try:
                generate_line_audio_sync(text, voice, temp_file)
            except Exception as e:
                logger.warning(f"Skipping line {i} (TTS failed): {e}")
                continue
            temp_files.append(temp_file)

        final_path = os.path.join(SHOWS_DIR, output_filename)
        from pydub import AudioSegment
        combined = AudioSegment.empty()
        
        for tf in temp_files:
            if os.path.exists(tf):
                segment = AudioSegment.from_wav(tf)
                combined += segment

        concat_audio_path = os.path.join(SHOWS_DIR, f"concat_audio_{job_id}.mp3")
        combined.export(concat_audio_path, format="mp3", bitrate="320k")

        # (Removed aggressive Pydub +10dB amplification that caused clipping and 1950s distortion)

        # No more background ducking: Sequential Radio Format
        import shutil
        shutil.move(concat_audio_path, final_path)
        logger.info(f"Show synthesized successfully with XTTS: {final_path}")
        return final_path

    except Exception as e:
        logger.error(f"Error synthesizing show: {e}")
        return ""
    finally:
        for f in temp_files:
            if os.path.exists(f):
                try:
                    os.remove(f)
                except Exception:
                    pass

async def synthesize_show(script_text: str, output_filename: str) -> str:
    """Async wrapper — runs synchronous synthesis in a thread."""
    return await asyncio.to_thread(synthesize_show_sync, script_text, output_filename)

