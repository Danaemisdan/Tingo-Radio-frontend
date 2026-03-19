"""
Ad Agent Service
Generates voiced radio adverts and queues them between shows.
Adverts are stored in media/ads/ and queued into Liquidsoap.
"""
import os
import json
import logging
import time
import threading
import uuid

logger = logging.getLogger(__name__)

ADS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../media/ads"))
ADS_CONFIG = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../ads.json"))
os.makedirs(ADS_DIR, exist_ok=True)

# In-memory ad queue — fills up as ads are generated
_ad_queue: list = []
_queue_lock = threading.Lock()

def load_ads() -> list:
    """Load ad briefs from ads.json. Returns list of ad dicts."""
    if not os.path.exists(ADS_CONFIG):
        # Create default ads.json template
        default_ads = [
            {
                "ad_id": "demo_01",
                "brand": "Tingo AI Radio",
                "product": "Premium Subscription",
                "tagline": "The future of African radio, powered by AI",
                "tone": "energetic and inspiring",
                "duration_seconds": 30,
                "play_every_n_shows": 2  # Play this ad every 2 show segments
            }
        ]
        with open(ADS_CONFIG, "w") as f:
            json.dump(default_ads, f, indent=4)
        logger.info("Created default ads.json")
        return default_ads

    with open(ADS_CONFIG, "r") as f:
        try:
            return json.load(f)
        except Exception as e:
            logger.error(f"Error reading ads.json: {e}")
            return []


def generate_ad_sync(ad: dict) -> str:
    """
    Generates a voiced radio advert from an ad brief dict.
    Returns path to the generated MP3, or "" on failure.
    """
    from .llm import llm_generate
    from .tts import synthesize_show_sync

    brand = ad.get("brand", "Unknown Brand")
    product = ad.get("product", "")
    tagline = ad.get("tagline", "")
    tone = ad.get("tone", "friendly and upbeat")
    duration = ad.get("duration_seconds", 30)

    # Build a fake show profile so we can reuse the LLM pipeline
    ad_show_profile = {
        "show_name": "Tingo Radio Ad Break",
        "concept": f"A premium radio advertisement for {brand}.",
        "host1_name": "Ife",
        "host2_name": "Tingo",
        "topics": [f"{product} by {brand}"]
    }

    prompt = (
        f"Write a compelling {duration}-second radio advertisement for: '{product}' by {brand}. "
        f"Tagline: '{tagline}'. "
        f"Tone: {tone}. "
        f"Two radio hosts (Ife and Tingo) deliver this ad together, alternating lines. "
        f"Make it punchy, memorable, and natural — exactly like a premium radio ad. "
        f"End with the tagline spoken clearly. "
        f"Write ONLY the dialogue lines in format 'Speaker: line'. No stage directions."
    )

    job_id = ad.get("ad_id", uuid.uuid4().hex[:6])
    output_name = f"ad_{job_id}_{int(time.time())}.mp3"

    try:
        logger.info(f"[Ad Agent] Generating ad for: {brand} — {product}")
        script = llm_generate.generate_radio_script(
            show_profile=ad_show_profile,
            prompt_modifier=prompt,
            duration_seconds=duration
        )
        output_path = synthesize_show_sync(script, output_name)
        if output_path:
            logger.info(f"[Ad Agent] Ad generated: {output_path}")
            with _queue_lock:
                _ad_queue.append({"ad_id": job_id, "path": output_path, "brand": brand})
        return output_path
    except Exception as e:
        logger.error(f"[Ad Agent] Failed to generate ad for {brand}: {e}")
        return ""


def get_next_ad() -> dict | None:
    """Pull the oldest ready ad from the queue. Returns None if empty."""
    with _queue_lock:
        if _ad_queue:
            return _ad_queue.pop(0)
    return None


def pregenerate_all_ads():
    """
    Pre-generate all ads defined in ads.json at startup.
    Waits 90 seconds first to let the automation loop complete its first LLM call
    (since the single llama.cpp instance can't handle concurrent inference).
    """
    logger.info("[Ad Agent] Pregenerator waiting 90s for automation loop to settle...")
    time.sleep(90)
    ads = load_ads()
    for ad in ads:
        try:
            generate_ad_sync(ad)
        except Exception as e:
            logger.error(f"[Ad Agent] Pregeneration failed for {ad.get('brand')}: {e}")
        time.sleep(5)  # buffer between sequential ads



def start_ad_pregenerator():
    """Start a daemon thread to pregenerate ads without blocking startup."""
    t = threading.Thread(target=pregenerate_all_ads, daemon=True)
    t.start()
    logger.info("[Ad Agent] Ad pre-generation started in background.")
