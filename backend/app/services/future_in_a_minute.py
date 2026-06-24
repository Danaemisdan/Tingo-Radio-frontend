"""
future_in_a_minute.py — Tingo AI Radio Station Feature

"The Future In A Minute" is a 45-75 second polished news feature that airs
between major broadcast dayparts (breakfast, mid-morning, lunch, drive time,
prime time, evening). One real tech/AI/digital story per segment. Single narrator.

Format:
  1. Branded intro:  "You're listening to Tingo AI Radio. Here's The Future In A Minute."
  2. One real story  (what is happening — one sentence)
  3. Why it matters  (why listeners should care — one sentence)
  4. What to do      (practical listener action — one sentence)
  5. Branded close:  "And that's The Future In A Minute on Tingo AI Radio."

Source: real stories fetched live from DuckDuckGo. No invented facts.
Voice:  single XTTS narrator (Dozy — professional male voice).
"""

import os
import time
import logging
import random
from datetime import datetime

logger = logging.getLogger(__name__)

# ── Daypart boundary hours (WAT = Africa/Lagos) ───────────────────────────────
# The feature airs ONCE per hour at each of these boundary points.
DAYPART_HOURS = {9, 12, 14, 17, 20, 23}

# ── Search topics rotated across the day ─────────────────────────────────────
SEARCH_TOPICS = [
    "artificial intelligence news",
    "AI technology today",
    "tech companies digital future",
    "Africa technology AI news",
    "AI jobs work future",
    "social media algorithm news",
    "robotics automation news",
    "digital economy Africa",
    "machine learning breakthrough",
    "big tech regulation news",
]

# ── State tracking ─────────────────────────────────────────────────────────────
_last_aired_hour: int = -1   # WAT hour when we last aired a segment


def should_air_now() -> bool:
    """
    Returns True exactly once per eligible daypart hour.
    Resets automatically when the hour changes.
    """
    global _last_aired_hour
    import pytz
    tz  = pytz.timezone("Africa/Lagos")
    now = datetime.now(tz)
    hour = now.hour

    if hour in DAYPART_HOURS and hour != _last_aired_hour:
        _last_aired_hour = hour
        return True
    return False


def _fetch_real_story() -> dict:
    """
    Pull a real tech/AI story from DuckDuckGo.
    Returns {"title": ..., "body": ..., "source": ...} or {} on failure.
    """
    from duckduckgo_search import DDGS

    topic = random.choice(SEARCH_TOPICS)
    logger.info(f"[FutureInAMin] Fetching story for topic: '{topic}'")

    try:
        results = DDGS().text(f"{topic} today site:reuters.com OR site:bbc.com OR site:apnews.com OR site:techcrunch.com OR site:theverge.com", max_results=8)
        if not results:
            # Broader fallback
            results = DDGS().text(f"{topic} today", max_results=8)

        for r in results:
            title = (r.get("title") or "").strip()
            body  = (r.get("body")  or "").strip()
            href  = (r.get("href")  or "")
            if title and body and len(body) > 60:
                # Derive a clean source name from the URL
                source = "Reuters"
                for domain, name in [
                    ("reuters.com", "Reuters"), ("bbc.com", "BBC"),
                    ("apnews.com",  "AP News"), ("techcrunch.com", "TechCrunch"),
                    ("theverge.com","The Verge"),("wired.com", "Wired"),
                    ("guardian.com","The Guardian"),
                ]:
                    if domain in href:
                        source = name
                        break
                logger.info(f"[FutureInAMin] Story found: {title[:70]}")
                return {"title": title, "body": body[:600], "source": source}

    except Exception as e:
        logger.error(f"[FutureInAMin] DuckDuckGo fetch failed: {e}")

    return {}


def _generate_script(story: dict) -> str:
    """
    Use the LLM to write the formatted single-narrator script from the real story.
    Returns a script with 'Dozy:' speaker labels so XTTS uses the professional male voice.
    """
    from .llm import llm_generate

    system_prompt = """You are a broadcast scriptwriter for Tingo AI Radio.
You write a short daily feature called "The Future In A Minute".

The narrator is a single, calm, professional voice.

STRICT RULES:
- Every line MUST start with exactly: Dozy:
- NEVER invent facts. Only use the story provided.
- Plain broadcast English. No jargon. No alarmist language.
- Short sentences. Conversational pace. Sound like a smart friend explaining news.
- Total word count: 90-140 words MAXIMUM.
- ZERO stage directions. No [pauses], no *sighs*, no (laughs). Nothing in brackets or asterisks.
- Do NOT add any explanation or preamble outside the script itself.

OUTPUT FORMAT — FOLLOW EXACTLY:
Dozy: You're listening to Tingo AI Radio. Here's The Future In A Minute.
Dozy: [One sentence: what is happening, reference the real story]
Dozy: Why it matters: [One sentence: why listeners should care]
Dozy: What to do with it: [One sentence: practical action or awareness for the listener]
Dozy: And that's The Future In A Minute on Tingo AI Radio."""

    user_prompt = f"""Write "The Future In A Minute" using this real story:

HEADLINE: {story['title']}
DETAIL: {story['body']}
SOURCE: {story['source']}

Write ONLY the script. Follow the format exactly. Stay under 140 words total."""

    script = llm_generate.generate_raw_sync(system_prompt, user_prompt, max_tokens=250)

    # Sanity check: if LLM didn't produce proper Dozy: lines, wrap it
    if script and "Dozy:" not in script:
        logger.warning("[FutureInAMin] LLM ignored format — wrapping output manually.")
        clean = script.strip().replace("\n", " ")
        script = (
            "Dozy: You're listening to Tingo AI Radio. Here's The Future In A Minute.\n"
            f"Dozy: {clean}\n"
            "Dozy: And that's The Future In A Minute on Tingo AI Radio."
        )

    return script


def generate_future_in_a_minute_sync() -> str:
    """
    Full pipeline: fetch story → generate script → synthesize audio.
    Returns absolute path to the generated mp3, or "" on failure.
    """
    from .tts import synthesize_show_sync

    # 1. Fetch a real story
    story = _fetch_real_story()
    if not story:
        logger.error("[FutureInAMin] No story available. Skipping segment.")
        return ""

    # 2. Generate the script
    script = _generate_script(story)
    if not script or len(script.strip()) < 30:
        logger.error("[FutureInAMin] Script generation failed or too short. Skipping.")
        return ""

    logger.info(f"[FutureInAMin] Script preview:\n{script[:200]}")

    # 3. Synthesize audio
    output_filename = f"future_in_a_minute_{int(time.time())}.mp3"
    audio_path = synthesize_show_sync(script, output_filename)

    if audio_path and os.path.exists(audio_path):
        logger.info(f"[FutureInAMin] ✅ Segment ready: {audio_path}")
        return audio_path

    logger.error("[FutureInAMin] Audio synthesis failed.")
    return ""
