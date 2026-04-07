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

# Available voice files: ife_target.wav (female), Dozy_target.wav (male)
# tingo_target.wav does NOT exist — never reference it.
VOICE_MAP = {
    # Default Nigerian Hosts
    "Ife": "ife_target.wav",
    "Dozy": "Dozy_target.wav",
    "Tingo": "Dozy_target.wav",  # Tingo = male voice
    
    # AI Personas
    "TingoAI Max": "Dozy_target.wav",
    "AdaAI": "ife_target.wav",
    "Tingo Civic AI": "Dozy_target.wav",
    "Tingo Business AI": "ife_target.wav",
    "Tingo Emotion AI": "ife_target.wav",
    "Tingo Sports AI": "Dozy_target.wav",
    "Tingo Culture AI": "Dozy_target.wav",
    "TingoGPT Tech": "ife_target.wav",

    # Human Co-hosts / Callers
    "Yaw": "Dozy_target.wav",
    "Sheriff Quadry": "Dozy_target.wav",
    "Fola Folayan": "ife_target.wav",
    "Chukwuemeka": "Dozy_target.wav",
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

def generate_line_audio_sync(text: str, voice: str, output_path: str, is_interactive: bool = False):
    """
    Synthesize one line using local XTTS zero-shot cloning server.
    """
    from app.services.automation import _radio_state, CallerInterruptedException
    
    # Absolute Preemption logic: 
    # If the background generation loop tries to feed lines to the TTS engine while the 
    # caller is active, instantly raise the interrupt to crash the background block.
    # This prevents the local XTTS server from being locked for 45s while responding to the caller.
    if not is_interactive and _radio_state.get("current_segment") == "interactive":
        logger.warning("Aborting background TTS generation because live caller took priority!")
        raise CallerInterruptedException({"type": "live_caller_override_tts"})
    import re
    
    # Strip ALL bracketed emotion tags anywhere in the prompt string so Coqui doesn't literally pronounce them.
    text = re.sub(r'\[.*?\]', '', text).strip()
    
    # Force Coqui to spell out "A I" without dragging out the pause
    text = re.sub(r'\bAI\b', 'A I', text)
    text = re.sub(r'\bAi\b', 'A I', text)
    
    # Prevent XTTS from literally sounding out "dot dot dot"
    text = text.replace("...", ", ")
        
    final_text = text
    
    url = "http://localhost:8001/synthesize"
    payload = {
        "text": final_text,
        "speaker_wav": voice,
        "language": "en"
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
                logger.warning(f"XTTS server not ready or failed (attempt {attempt+1}/{max_retries}): {e}. Retrying in 5 seconds...")
                time.sleep(5)
            else:
                logger.error(f"XTTS server failed for voice {voice}: {e}")
                raise RuntimeError(f"XTTS Voice Cloning strictly required but failed: {e}")

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

        # Hardcode the gender mappings so 'Ife' never gets the male voice and 'Dozy' never gets the female voice.
        for i, line in enumerate(parsed_lines):
            speaker = line['speaker'].strip()
            text = line['text']
            
            sl = speaker.lower()
            # Only ife_target.wav and Dozy_target.wav exist on disk
            if "ife" in sl or "ada" in sl or "fola" in sl:
                voice = "ife_target.wav"
            elif "dozy" in sl:
                voice = "Dozy_target.wav"
            else:
                # All other names (Tingo, Yaw, Sheriff, AI personas, etc.) → male voice
                voice = "Dozy_target.wav"
                
            temp_file = os.path.join(SHOWS_DIR, f"tmp_{job_id}_{i}.wav")
            generate_line_audio_sync(text, voice, temp_file)
            temp_files.append(temp_file)

        final_path = os.path.join(SHOWS_DIR, output_filename)
        from pydub import AudioSegment
        combined = AudioSegment.empty()
        
        for tf in temp_files:
            if os.path.exists(tf):
                segment = AudioSegment.from_wav(tf)
                combined += segment

        # CRITICAL FIX: Add 3.5s of silence to the end so Liquidsoap's 3-second crossfade 
        # doesn't chop off the last words of the host speaking!
        combined += AudioSegment.silent(duration=3500)

        concat_audio_path = os.path.join(SHOWS_DIR, f"concat_audio_{job_id}.wav")
        combined.export(concat_audio_path, format="wav")

        # Apply a 10% speedup to make the pacing much tighter and more energetic using ffmpeg
        try:
            subprocess.run([
                "ffmpeg", "-y", "-i", concat_audio_path, 
                "-filter:a", "atempo=1.08", 
                "-c:a", "libmp3lame", "-b:a", "320k", 
                final_path
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            logger.info(f"Show synthesized successfully with 8% speedup: {final_path}")
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to speedup audio with ffmpeg, falling back to raw concat: {e}")
            import shutil
            shutil.move(concat_audio_path, final_path)
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

