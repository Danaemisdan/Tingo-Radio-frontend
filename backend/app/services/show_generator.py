"""
ShowGeneratorService - Fully synchronous orchestration.
Called from inside daemon threads that have their own event loops.
No async/await needed here since both LLM and TTS are synchronous operations.
"""
import logging
from .llm import llm_generate
from .tts import synthesize_show_sync

logger = logging.getLogger(__name__)


import random

STATION_IDS = [
    "You're locked in with Tingo AI Radio — the smartest station on the continent.",
    "This is Tingo AI Radio. Ife and Dozy, live and unfiltered.",
    "Tingo AI Radio — where Lagos meets the future.",
    "You're listening to Tingo AI Radio. No script. Just real talk.",
    "Stay locked in — this is Tingo AI Radio with Ife and Dozy.",
    "Tingo AI Radio. The station that thinks for itself.",
    "Back on the air — Tingo AI Radio, your 24/7 African frequency.",
    "This is Ife and Dozy on Tingo AI Radio. Let's get into it.",
]

class ShowGeneratorService:
    def __init__(self):
        pass

    def generate_show_segment_sync(self, show_profile: dict, prompt_modifier: str, output_filename: str) -> str:
        """
        Fully synchronous show segment generator.
        Calls LLM for an emotional, high-energy radio script → Coqui XTTS synthesis.
        """
        # Force Ife+Dozy names in the show profile so LLM uses them
        profile = dict(show_profile)
        profile["host1_name"] = "Ife"
        profile["host2_name"] = "Dozy"

        logger.info(f"Generating: [{profile['show_name']}]")

        # Stronger prompt for natural emotion and energy
        emotion_modifier = (
            "\n\nCRITICAL STYLE RULES:\n"
            "- Ife is warm, vibrant, quick-witted, laughs easily, occasionally teases Dozy.\n"
            "- Dozy is sharp, opinionated, confident, sometimes provocative, always insightful.\n"
            "- They interrupt each other naturally, finish each other's sentences sometimes.\n"
            "- Use Nigerian expressions, slang, and references naturally (e.g. 'abeg', 'no cap', 'e don do').\n"
            "- Vary sentence length: short punchy lines mixed with longer takes.\n"
            "- Include genuine laughter cues written as 'Ha!' or 'Haha!' — not '[laughs]'.\n"
            "- NEVER use stage directions in brackets like [laughs], [sighs], [pause].\n"
            "- Each line must be spoken — no action descriptions.\n"
            "- Write at least 12 exchanges (24 lines minimum). Make it feel LIVE.\n"
        )
        full_prompt = prompt_modifier + emotion_modifier

        try:
            script = llm_generate.generate_radio_script(
                show_profile=profile,
                prompt_modifier=full_prompt,
                duration_seconds=80  # ~80s of dialogue before synthesis
            )
        except Exception as e:
            logger.error(f"LLM script generation failed: {e}", exc_info=True)
            return ""

        # Unique station ID opener — never the same twice in a row
        station_id = random.choice(STATION_IDS)
        script = f"Ife: {station_id}\n" + script

        logger.info("Script ready. Synthesizing with Coqui XTTS...")
        try:
            audio_path = synthesize_show_sync(script, output_filename)
        except Exception as e:
            logger.error(f"TTS synthesis failed: {e}", exc_info=True)
            return ""

        if audio_path:
            logger.info(f"✅ Show ready: {audio_path}")
        else:
            logger.error("TTS returned empty path.")
        return audio_path

    async def generate_show_segment(self, show_profile: dict, topic: str, output_filename: str) -> str:
        return self.generate_show_segment_sync(show_profile, topic, output_filename)


show_generator = ShowGeneratorService()
