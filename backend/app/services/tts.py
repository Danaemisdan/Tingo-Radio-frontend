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
import requests

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

def parse_script(script_text: str):
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
    Synthesize one line using local XTTS zero-shot cloning server or edge-tts for interactive.
    """
    from app.services.automation import _radio_state, CallerInterruptedException
    
    # Absolute Preemption logic: 
    # If the background generation loop tries to feed lines to the TTS engine while the 
    # caller is active, instantly raise the interrupt to crash the background block.
    # This prevents the local XTTS server from being locked for 45s while responding to the caller.
    if not is_interactive and _radio_state.get("current_segment") == "interactive":
        logger.warning("Aborting background TTS generation because live caller took priority!")
        raise CallerInterruptedException({"type": "live_caller_override_tts"})
    
    # Strip ALL bracketed/parenthetical stage direction tags (LLM loves adding these)
    text = re.sub(r'\[.*?\]', '', text).strip()
    text = re.sub(r'\(.*?\)', '', text).strip()
    # Strip asterisk actions (*laughs*, *sighs*)
    text = re.sub(r'\*[^*]+\*', '', text).strip()
    # Clean up dashes and ellipses that TTS reads weirdly
    text = text.replace("...", ", ").replace(" -- ", ", ").replace("—", ", ").strip()
    # Strip emojis that make XTTS moan/hum
    text = re.sub(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U00002702-\U000027B0]+', '', text).strip()

    # ----------------------------------------------------------------
    # SHARED FILLER NORMALIZATION (both XTTS and edge-tts paths)
    # ----------------------------------------------------------------
    SHARED_MAP = {
        r'\bMm\b': 'hmm',   r'\bmm\b': 'hmm',
        r'\bMhm\b': 'mm-hmm', r'\bmhm\b': 'mm-hmm',
        r'\bUhh\b': 'uh',   r'\buhh\b': 'uh',
        r'\bOAP\b': 'O-A-P', r'\bMIC\b': 'mike',
    }
    for p, r in SHARED_MAP.items():
        text = re.sub(p, r, text)

    if is_interactive:
        import json
        config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../tts_config.json"))
        engine = "kokoro"
        config = {}
        try:
            with open(config_path, "r") as f:
                config = json.load(f)
                engine = config.get("interactive_engine", "kokoro")
        except Exception as e:
            logger.error(f"Failed to load tts_config.json, falling back to Kokoro: {e}")

        # ENGINE 1: KOKORO ONNX
        if engine == "kokoro":
            try:
                from kokoro_onnx import Kokoro
                import soundfile as sf
                
                models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../media/models"))
                os.makedirs(models_dir, exist_ok=True)
                
                k_model = os.path.join(models_dir, "kokoro-v1.0.onnx")
                k_voices = os.path.join(models_dir, "voices-v1.0.bin")
                
                if not os.path.exists(k_model):
                    r = requests.get("https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx", stream=True)
                    with open(k_model, "wb") as f:
                        for chunk in r.iter_content(chunk_size=8192): f.write(chunk)
                if not os.path.exists(k_voices):
                    r = requests.get("https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin", stream=True)
                    with open(k_voices, "wb") as f:
                        for chunk in r.iter_content(chunk_size=8192): f.write(chunk)
                    
                ko = Kokoro(k_model, k_voices)
                
                k_config = config.get("kokoro", {})
                k_voice = k_config.get("female_voice", "bf_emma") if "ife" in voice.lower() else k_config.get("male_voice", "bm_george")
                
                audio, sample_rate = ko.create(text, voice=k_voice, speed=1.0, lang="en-gb")
                sf.write(output_path, audio, sample_rate)
                logger.info(f"Kokoro-ONNX synthesized instantly for {k_voice}")
                return
            except Exception as e:
                logger.error(f"Kokoro ONNX failed: {e}. Falling back to slow XTTS.")

        # ENGINE 2: EDGE TTS (Microsoft Neural)
        elif engine == "edge_tts":
            try:
                e_config = config.get("edge_tts", {})
                e_voice = e_config.get("female_voice", "en-NG-EzinneNeural") if "ife" in voice.lower() else e_config.get("male_voice", "en-NG-AbeoNeural")
                subprocess.run([
                    "edge-tts", "--text", text, "--voice", e_voice, "--write-media", output_path
                ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                logger.info(f"Edge-TTS synthesized instantly for {e_voice}")
                return
            except Exception as e:
                logger.error(f"Edge-TTS failed: {e}. Falling back to slow XTTS.")

        # ENGINE 3: FISH AUDIO
        elif engine == "fish":
            try:
                f_config = config.get("fish", {})
                f_voice = f_config.get("female_voice", "ife_fish") if "ife" in voice.lower() else f_config.get("male_voice", "Dozy_fish")
                f_url = f_config.get("server_url", "http://localhost:8082/v1/tts")
                
                payload = {
                    "text": text,
                    "reference_id": f_voice,
                    "format": "wav"
                }
                rsp = requests.post(f_url, json=payload, timeout=10)
                rsp.raise_for_status()
                with open(output_path, 'wb') as f:
                    f.write(rsp.content)
                logger.info(f"Fish API synthesized instantly for {f_voice}")
                return
            except Exception as e:
                logger.error(f"Fish API failed: {e}. Falling back to slow XTTS.")

        # ENGINE 4: XTTS (interactive only — falls through to XTTS block below)
        elif engine == "xtts":
            pass  # falls through to the XTTS request block below

    # ---------------------------------------------------------------
    # SHOW / AD PATH: Use edge-tts Nigerian neural voices.
    # Nigerian voices sound excellent and require zero extra servers.
    # ---------------------------------------------------------------
    # Map voice filename → edge-tts voice name
    if "ife" in voice.lower() or "ada" in voice.lower() or "fola" in voice.lower():
        edge_voice = "en-NG-EzinneNeural"   # Female Nigerian
    else:
        edge_voice = "en-NG-AbeoNeural"     # Male Nigerian

    try:
        subprocess.run(
            [
                "python", "-m", "edge_tts",
                "--text", text,
                "--voice", edge_voice,
                "--write-media", output_path
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=60
        )
        logger.info(f"[Show TTS] edge-tts synthesized line for {edge_voice}")
        return
    except Exception as e:
        logger.error(f"[Show TTS] edge-tts failed: {e}")
        raise RuntimeError(f"edge-tts failed for show synthesis: {e}")

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

