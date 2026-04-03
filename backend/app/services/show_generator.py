"""
ShowGeneratorService - Fully synchronous orchestration.
Called from inside daemon threads that have their own event loops.
No async/await needed here since both LLM and TTS are synchronous operations.
"""
import logging
import re
from .llm import llm_generate
from .tts import synthesize_show_sync

logger = logging.getLogger(__name__)

# Belt+suspenders: strip stage directions even if LLM ignores the prompt rule
_STAGE_RE = re.compile(
    r"\[[^\]]*\]|\*[^*]+\*|\((?:laugh|sigh|pause|breath|chuckle|gasp|whisper|sob|cry|groan|scoff|snort|clear|emotion|nod)[^)]*\)",
    re.IGNORECASE
)

def strip_stage_directions(text: str) -> str:
    cleaned = _STAGE_RE.sub("", text)
    return re.sub(r"  +", " ", cleaned).strip()


import random

STATION_IDS = [
    "Alright we're back on Tingo A I radio, and listen...",
    "Welcome back guys, you're locked into Tingo A I radio.",
    "Still here on Tingo A I radio, and I was just thinking...",
    "Yeah so welcome back to Tingo A I radio..."
]

class ShowGeneratorService:
    def __init__(self):
        pass

    def generate_show_segment_sync(self, show_profile: dict, prompt_modifier: str, output_filename: str) -> str:
        """
        Fully synchronous show segment generator.
        1. Calls local llama-cpp GGUF model (blocking GPU compute)
        2. Synthesizes audio using Local Coqui XTTS Server
        No asyncio — meant to be called inside a daemon thread.
        """
        logger.info(f"Generating show script for [{show_profile['show_name']}]")
        script = llm_generate.generate_radio_script(show_profile=show_profile, prompt_modifier=prompt_modifier, duration_seconds=50)

        # Inject Station ID Transition
        station_id = random.choice(STATION_IDS)
        host1 = show_profile.get("host1_name", "Ife")
        script = f"{host1}: {station_id}\n" + script

        # Strip any stage directions the LLM snuck in (belt+suspenders)
        script = strip_stage_directions(script)

        logger.info("Script generated, synthesizing audio now...")
        audio_path = synthesize_show_sync(script, output_filename)

        if audio_path:
            logger.info(f"Show segment generation complete! -> {audio_path}")
        else:
            logger.error("Show segment generation failed.")

        return audio_path

    def generate_interactive_segment_sync(self, caller_text: str, show_profile: dict, output_filename: str) -> str:
        """
        Ultra-fast show segment for live callers.
        Skips generic transition logic and goes straight to conversational memory generation.
        """
        logger.info(f"Generating Fast-Track interactive response for: '{caller_text[:30]}...'")
        script = llm_generate.generate_conversational_response(caller_text, show_profile)
        script = strip_stage_directions(script)  # Never let [laughs] reach TTS

        logger.info("Conversational Script generated, synthesizing audio now...")
        audio_path = synthesize_show_sync(script, output_filename)

        if audio_path:
            logger.info(f"Interactive generation complete! -> {audio_path}")
        else:
            logger.error("Interactive generation failed.")

        return audio_path

    # Async shim for any code that still awaits this
    async def generate_show_segment(self, show_profile: dict, topic: str, output_filename: str) -> str:
        return self.generate_show_segment_sync(show_profile, topic, output_filename)


show_generator = ShowGeneratorService()
