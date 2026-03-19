"""
Chat Response Agent
- Reads messages from the audience queue
- Detects song requests (fuzzy matches against the music library)
- Queues matched songs into Liquidsoap
- Generates a voiced TTS host response confirming the request on air
"""
import os
import re
import logging
import time
import difflib
import threading

logger = logging.getLogger(__name__)

MUSIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../media/music"))

# Pending song requests waiting to be played — shared with automation loop
_song_request_queue: list = []  # list of dicts: {sender, song_title, file_path}
_request_lock = threading.Lock()

# Already-responded message IDs to avoid double-processing
_processed_message_ids: set = set()

# ── Song request detection ────────────────────────────────────────────────────

_REQUEST_PATTERNS = [
    r"(?:can you|please|pls|plz|could you)?\s*play\s+(.+)",
    r"(?:i want|i'd like|request)\s+(?:to hear|to listen to)?\s*(.+)",
    r"(?:queue|add|put on)\s+(.+)",
    r"(.+)\s+(?:next|please|pls|plz)$",
]

def detect_song_request(text: str) -> str | None:
    """
    Returns the requested song name string if the message looks like a song request,
    otherwise returns None.
    """
    text_lower = text.lower().strip()
    for pattern in _REQUEST_PATTERNS:
        match = re.search(pattern, text_lower, re.IGNORECASE)
        if match:
            candidate = match.group(1).strip()
            # Filter out very short noise
            if len(candidate) >= 2:
                return candidate
    return None


def find_best_matching_song(query: str) -> tuple[str, str] | None:
    """
    Fuzzy-matches the query against MP3 filenames in the music directory.
    Returns (song_title, file_path) or None if no good match is found.
    """
    if not os.path.exists(MUSIC_DIR):
        return None

    music_files = [f for f in os.listdir(MUSIC_DIR) if f.lower().endswith(".mp3")]
    if not music_files:
        return None

    # Build a list of normalised names for matching
    names = [os.path.splitext(f)[0].lower().replace("_", " ").replace("-", " ") for f in music_files]
    query_clean = query.lower().replace("_", " ").replace("-", " ")

    # Use difflib to find closest match
    matches = difflib.get_close_matches(query_clean, names, n=1, cutoff=0.35)
    if matches:
        best_name = matches[0]
        idx = names.index(best_name)
        file_path = os.path.join(MUSIC_DIR, music_files[idx])
        title = os.path.splitext(music_files[idx])[0]
        return title, file_path

    return None


# ── On-air host response for a song request ─────────────────────────────────

def generate_song_request_response_sync(sender: str, song_title: str, found: bool, host1: str, host2: str) -> str:
    """
    Generates a short voiced host response (2-4 lines) acknowledging a listener's song request.
    Returns path to the MP3, or "" on failure.
    """
    from .llm import llm_generate
    from .tts import synthesize_show_sync

    profile = {
        "show_name": "Tingo AI Radio",
        "concept": "A song request acknowledgement on air.",
        "host1_name": host1,
        "host2_name": host2,
        "topics": [song_title]
    }

    if found:
        prompt = (
            f"A listener named '{sender}' just requested the song '{song_title}' via chat. "
            f"Write exactly 3 lines of dialogue between {host1} and {host2}. "
            f"{host1} shouts out {sender} by name and says the song is coming up. "
            f"{host2} hypes it up and says something nice about the track. "
            f"{host1} closes with 'Stay locked to Tingo AI Radio.' "
            f"No stage directions. Just dialogue lines."
        )
    else:
        prompt = (
            f"A listener named '{sender}' requested '{song_title}' but we don't have it in the library. "
            f"Write exactly 3 lines of dialogue between {host1} and {host2}. "
            f"{host1} apologises warmly, names {sender}, and says they'll look into getting it. "
            f"{host2} suggests a similar vibe is coming up soon. "
            f"{host1} encourages {sender} to keep chatting. "
            f"No stage directions. Just dialogue lines."
        )

    import uuid
    output_name = f"request_response_{uuid.uuid4().hex[:6]}.mp3"
    try:
        script = llm_generate.generate_radio_script(
            show_profile=profile,
            prompt_modifier=prompt,
            duration_seconds=20
        )
        return synthesize_show_sync(script, output_name)
    except Exception as e:
        logger.error(f"[Chat Agent] Failed to generate response: {e}")
        return ""


# ── Queue management ─────────────────────────────────────────────────────────

def get_next_song_request() -> dict | None:
    """Pull the oldest pending request from the queue."""
    with _request_lock:
        if _song_request_queue:
            return _song_request_queue.pop(0)
    return None


def process_message_for_song_request(message: dict, host1: str = "Ife", host2: str = "Tingo") -> dict | None:
    """
    Called by the automation loop or chat endpoint for every incoming message.
    If a song request is detected:
      1. Fuzzy-match against music library
      2. Queue the song file (or note not found)
      3. Generate a voiced response
    Returns a dict with result info, or None if not a request.
    """
    msg_id = id(message)
    if msg_id in _processed_message_ids:
        return None
    _processed_message_ids.add(msg_id)
    if len(_processed_message_ids) > 500:
        _processed_message_ids.clear()

    text = message.get("text", "")
    sender = message.get("sender", "A listener")

    song_query = detect_song_request(text)
    if not song_query:
        return None

    logger.info(f"[Chat Agent] Song request detected from '{sender}': '{song_query}'")

    match = find_best_matching_song(song_query)
    if match:
        song_title, file_path = match
        with _request_lock:
            _song_request_queue.append({
                "sender": sender,
                "song_title": song_title,
                "file_path": file_path,
                "found": True
            })
        logger.info(f"[Chat Agent] Matched '{song_query}' → '{song_title}' queued for playback.")
        return {"found": True, "song_title": song_title, "file_path": file_path}
    else:
        logger.info(f"[Chat Agent] No match found for '{song_query}'.")
        return {"found": False, "song_title": song_query, "file_path": None}


# ── Chat AI reply (text only, lightweight) ───────────────────────────────────

def generate_text_reply(user_message: str, chat_history: list) -> str:
    """
    Generates a casual 1-sentence text reply from the AI DJ (Tingo/Ife).
    For the websocket chat pane — no TTS, just text.
    """
    from .llm import llm_generate

    recent = [m for m in chat_history[-5:]]
    profile = {
        "show_name": "Tingo AI Radio Chat",
        "concept": "The chat room of Tingo AI Radio.",
        "host1_name": "Ife",
        "host2_name": "Tingo",
        "topics": [user_message]
    }
    prompt = (
        f"You are Ife, an AI host hanging out in Tingo AI Radio's live chat. "
        f"Recent chat: {recent}. "
        f"A listener just said: '{user_message}'. "
        f"Write ONE short casual reply (max 20 words). Be warm, witty, and authentic Nigerian radio energy. "
        f"Do NOT start with 'Ife:'. Just the message itself."
    )
    try:
        reply = llm_generate.generate_radio_script(
            show_profile=profile,
            prompt_modifier=prompt,
            duration_seconds=5
        )
        # Clean up any leftover speaker labels
        reply = re.sub(r"^(Ife|Tingo|Host\d?):\s*", "", reply.strip(), flags=re.IGNORECASE)
        return reply.split("\n")[0].strip()
    except Exception as e:
        logger.error(f"[Chat Agent] Text reply failed: {e}")
        return "Stay tuned, more fire coming up on Tingo AI Radio!"
