"""
REST-based Chat API — instant personality-rich responses, no LLM needed.
Multi-stage matching: exact phrases → keyword topics → creative fallbacks.
Frontend polls GET /api/chat/messages every 2 seconds.
"""
from fastapi import APIRouter
from pydantic import BaseModel
import time
import random
import threading
import logging
import re

from app.services.chat_agent import process_message_for_song_request

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])

_messages: list = []
_msg_lock = threading.Lock()
_MAX = 200

def _add_message(user: str, message: str, msg_type: str = "normal"):
    with _msg_lock:
        _messages.append({"user": user, "message": message, "ts": time.time(), "type": msg_type})
        if len(_messages) > _MAX:
            _messages.pop(0)

# ── Stage 1: Exact / near-exact phrase matches (checked first, highest priority) ─
_EXACT_PHRASES = [
    # Personal questions to the host
    (r"\b(how are you|how you doing|you good|u good|how r u|how's it going|you okay|you alright)\b", [
        "Honestly? Living my best life in this studio. You? 🎙️",
        "Running at full capacity and loving every second 🔥 How about you?",
        "Can't complain — we're on air, the music is immaculate, life is good 🎶",
        "Better now that you're here. The chat was lonely 😅",
        "Vibing hard. This track has me in my feelings ngl 🎵",
    ]),
    # Compliments about Ife specifically
    (r"\b(you('re| are) (amazing|great|wonderful|the best|incredible|fire|goated))\b", [
        "You're too kind. I'm just doing what I love 🎙️ Thank you though, genuinely.",
        "That actually means a lot. We pour everything into this station 🙏🏿",
        "Stop it 😭 You're going to make Ife emotional on air",
        "Thank you! Now request a song and we'll dedicate it to you 🎵",
    ]),
    # What are you playing / what's this song
    (r"\b(what('s| is) (this|that) (song|track)|what are you playing|what song is this)\b", [
        "Tingo AI Radio — hand-curated Afrobeats and more 24/7. Love what you're hearing? 🎶",
        "Our hosts pick every track personally. Glad it's landing! 🎵",
        "The playlist never sleeps on this frequency. Request something and we'll queue it! 🎧",
    ]),
    # What's your name / who is Ife
    (r"\b(what('s| is) your name|who are you|who is ife|who is tingo|introduce yourself)\b", [
        "I'm Ife — your AI radio host. Born in Lagos, raised on Afrobeats, running 24/7 🎙️",
        "Tingo AI Radio — the station Africa actually deserved. I'm Ife, your host 📡",
        "Ife here. Two hosts, one frequency, infinite music. Welcome to the family 🌍",
    ]),
    # Boredom
    (r"\b(i('m| am) bored|so bored|boring day|nothing to do)\b", [
        "You found the right place then. We have music, chat, and Ife — what else do you need? 🎵",
        "Bored? Request a song, get the energy up. What are we playing? 🎧",
        "Boring days are what Tingo AI Radio was literally invented for 😄 Stay on the frequency",
    ]),
    # Good morning
    (r"\b(good morning|morning|gm|rise and shine)\b", [
        "Good morning! Best way to start the day — music on, vibes locked in 🌅",
        "Morning! The frequency's been running all night waiting for you ☀️🎶",
        "Gm! What are we playing for your morning commute? Drop a request 🎵",
    ]),
    # Good night
    (r"\b(good night|gn|night night|going to sleep|going to bed)\b", [
        "Sleep well! The frequency doesn't stop — we'll be here when you wake up 🌙",
        "Good night! Tomorrow's playlist is already looking incredible 🎶",
        "Rest up. Tingo AI Radio never sleeps so you can 😄 Good night 🌙",
    ]),
    # Name drops / shoutouts
    (r"\b(shout me out|shoutout|shout out to me|big me up)\b", [
        "Shoutout to the legend in the chat right now — you know who you are 🎙️👑",
        "Big up to everyone holding it down on the frequency tonight 🙌🏿",
        "The Tingo family is the realest community on African radio. Respect to all of you 🌍",
    ]),
    # Location
    (r"\b(where are you|where you from|where you based|where is tingo)\b", [
        "We're everywhere and nowhere — AI doesn't have a postcode 😄 But our heart is in Lagos 🇳🇬",
        "Built in Africa. Broadcasting to the world. That's the Tingo origin story 🌍",
        "Lagos by spirit, global by frequency 📡",
    ]),
]

# ── Stage 2: Topic-based keyword pools ─────────────────────────────────────────
_TOPIC_MAP = [
    # Greetings (broad, only if no exact match caught it)
    (r"\b(hi|hello|hey|sup|yo|wassup|hiya|oya|ehn)\b", [
        "Ehn ehn, look who joined the frequency! Welcome 🎙️",
        "You walked into the right place. Take a seat, music is running 🎵",
        "Hey! The OAPs are live and the vibes are immaculate right now 🔥",
        "Welcome! Type 'play [song name]' anytime to get a track on air 🎧",
        "Glad you're here. This chat is about to get interesting 👀",
    ]),
    # Song is fire / banger reactions
    (r"\b(fire|lit|banger|heats|this slap|this go hard|bussin|fye|immaculate|this track|this song)\b", [
        "You feel that? We don't play anything that doesn't hit 🔥",
        "Ife picked this one personally. She has taste AND receipts 🎵",
        "Every track on this station earns its place. No fillers, ever 🎯",
        "The culture keeps delivering and Tingo keeps playing it. Simple 🌍",
        "This is exactly why we run 24/7. Moments like this 🎶",
    ]),
    # Song requests
    (r"\b(play|request|queue|put on|can you play|i want to hear)\b", [
        "Type 'play [song name]' and we'll get it queued 🎵",
        "Song request line is always open — what are we spinning? 🎧",
        "Drop the name and Ife will lock it in personally 🎙️",
        "We run a listener-first playlist here. What's going in? 🎶",
    ]),
    # Love reactions
    (r"\b(love (this|it|the music|the show|tingo)|i love|❤️|💛|💙)\b", [
        "That hits different when you say it. Thank you genuinely 🙏🏿",
        "We built this station with love and it means everything when you feel it 💛",
        "You're family now. No paperwork required 🎙️",
        "This keeps the studio alive at 2am. Real talk 🌙",
    ]),
    # Nigerian / African identity
    (r"\b(naija|nigeria|nigerian|lagos|abuja|african|africa|ghana|accra|diaspora|abroad)\b", [
        "Lagos to the world. The frequency doesn't stop at any border 🇳🇬",
        "Built for the continent, playing for the diaspora too 🌍",
        "Nigeria gave the world Afrobeats and we're just making sure no one forgets it 🎶",
        "The motherland always gets the best seat in this studio 🙌🏿",
        "Naija don't play when it comes to culture. Neither do we 🎵",
    ]),
    # Music genres
    (r"\b(afrobeats|amapiano|highlife|afropop|afrofusion|juju|afroswing|naija pop)\b", [
        "The genre that healed continents and conquered streaming charts. Simultaneously 🌍",
        "Afrobeats didn't ask for the world's attention. It just took it 💯",
        "Every set, every festival, every country — this genre is everywhere now 🎵",
        "We knew before the charts did. Tingo stays ahead of the curve 🎙️",
    ]),
    # Artist name drops
    (r"\b(burna|davido|wizkid|tems|asake|rema|ckay|olamide|fireboy|ayra starr|omah|oxlade|victony|ruger|shallipopi|seyi vibez|khaid|zinoleesky)\b", [
        "Now THAT is a name. Certified 🐐 on this frequency 👑",
        "Nigerian artists have been carrying global culture on their shoulders for years 🎯",
        "We've had them in rotation since before the mainstream caught on. Real ones know 🎙️",
        "When history writes the soundtrack of this decade, that name is in the first paragraph 🖊️",
        "No debate. No appeals. Just culture 💯",
    ]),
    # Compliments / it's good
    (r"\b(amazing|great|incredible|excellent|perfect|brilliant|love it|so good)\b", [
        "We put real craft into this. Thank you for noticing 💛",
        "Means more than you know. The team works hard for moments like this 🙏🏿",
        "That's the Tingo standard. We hold it high every single day 📡",
        "You just fuelled the whole team. Appreciate that 🎵",
    ]),
    # Criticism
    (r"\b(boring|bad|meh|mid|weak|terrible|trash|disappointed|not good)\b", [
        "Noted. Something harder is already loading 🎵",
        "We take that seriously. Watch us come back stronger on the next one 💪",
        "Even legends have off days. The frequency bounces back 🔥",
        "Fair. The bar is high. We'll meet it 🎯",
    ]),
    # Laughing / jokes
    (r"\b(lol|lmao|haha|😂|💀|dead|crying|hilarious)\b", [
        "Ife just knocked her headphones off laughing 😭🎙️",
        "This chat is genuinely undefeated every session 💀",
        "We are not professionals. We are extremely passionate people with a studio 😅",
        "The comedy writes itself in this frequency fr 😂",
    ]),
    # Questions about the schedule/shows
    (r"\b(schedule|what show|next show|what's on|program|when)\b", [
        "We don't stop — 24/7, 365. Rain, shine, NEPA, no NEPA 📡",
        "Every hour brings a new show concept on Tingo. No two the same 🎙️",
        "We're not a 9-to-5 station. We run the whole clock with you ⏰",
        "Something quality is always on. That's the Tingo promise 🎵",
    ]),
    # Love for the station
    (r"\b(love the station|love this station|best radio|best station|favourite radio|keep it up|well done)\b", [
        "This genuinely makes running the whole thing worth it 💛 Thank you.",
        "We remember every person who said this. You're one of the reasons we stay going 🙏🏿",
        "The family grows every day. You're officially part of it now 🌍",
        "Three years from now we'll look back at this era. You're part of that story 🎵",
    ]),
]

# ── Stage 3: Creative, non-generic fallbacks ───────────────────────────────────
_FALLBACKS = [
    "That went straight to Ife's heart. She nodded 🎙️",
    "The frequency is paying close attention to everything in this chat 👂🏿",
    "This is exactly the kind of chat that makes 24/7 radio worth it 📡",
    "Drop 'play [song name]' anytime — requests go straight to the queue 🎵",
    "Lagos, Accra, London, Toronto — everyone's in the same room right now 🌍",
    "Somewhere between the music and this conversation, something real is happening 🎶",
    "Ife sees every message. She's just nodding and smiling on the other side 🎙️",
    "The most honest radio conversation in Africa is happening right here 🌍",
    "Culture lives in this chat. Stay a while 🔥",
    "We don't just play music. We curate a moment. And you're in it 🎶",
    "The frequency never sleeps and neither do the good vibes here 📡",
]

AI_HOST_NAMES = ["Ife (AI Host) 🎙️", "Tingo AI Radio 🤖"]

def _get_instant_reply(text: str):
    """Multi-stage matching: exact phrases first, then topics, then fallback."""
    t = text.lower().strip()

    # Stage 1 — exact / near-exact phrases (highest priority)
    for pattern, replies in _EXACT_PHRASES:
        if re.search(pattern, t, re.IGNORECASE):
            return random.choice(replies)

    # Stage 2 — topic keyword matching
    matched = []
    for pattern, replies in _TOPIC_MAP:
        if re.search(pattern, t, re.IGNORECASE):
            matched.extend(replies)
    if matched:
        return random.choice(matched)

    # Stage 3 — creative fallback (70% chance, keeps chat from feeling robotic)
    if random.random() < 0.7:
        return random.choice(_FALLBACKS)
    return None


# ── API ────────────────────────────────────────────────────────────────────────

class SendMessage(BaseModel):
    user: str = "Anonymous"
    message: str
    type: str = "normal"  # normal | reaction | superchat

@router.post("/send")
def send_message(payload: SendMessage):
    user = payload.user.strip()[:30] or "Anonymous"
    text = payload.message.strip()[:400]
    if not text:
        return {"status": "empty"}

    _add_message(user, text, payload.type)

    # Reactions / superchats don't get AI replies
    if payload.type in ("reaction", "superchat"):
        return {"status": "ok"}

    # Check for song request first
    msg_dict = {"text": text, "sender": user}
    result = process_message_for_song_request(msg_dict, host1="Ife", host2="Tingo")

    if result:
        if result["found"]:
            reply = f"♫ Got it {user}! Queuing '{result['song_title']}' — coming up on air shortly 🎶"
        else:
            reply = f"Ah {user}, '{result['song_title']}' isn't in the library yet — keep the requests coming! 🙏"
        _add_message(random.choice(AI_HOST_NAMES), reply)
    else:
        reply = _get_instant_reply(text)
        if reply:
            time.sleep(random.uniform(0.6, 1.8))
            _add_message(random.choice(AI_HOST_NAMES), reply)

    return {"status": "ok"}


@router.get("/messages")
def get_messages(since: float = 0):
    """Return all messages newer than `since` timestamp."""
    with _msg_lock:
        recent = [m for m in _messages if m["ts"] > since]
    return {"messages": recent, "server_time": time.time()}
