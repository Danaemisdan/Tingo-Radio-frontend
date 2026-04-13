import requests
import json
import logging
import threading
import glob
from typing import Optional, List, Dict

logger = logging.getLogger(__name__)

from llama_cpp import Llama
import os

# ── Model Auto-Detection ──────────────────────────────────────────────────────
# Priority: Qwen2.5-3B > Qwen2.5-7B > any GGUF in models/ > fallback 1B
MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../models"))

def _find_model() -> str:
    """Auto-detect the best available GGUF model. Prefers Qwen2.5-3B."""
    priority = [
        "Qwen2.5-3B*",
        "qwen2.5-3b*",
        "Qwen2.5-7B*",
        "qwen2.5-7b*",
        "*.gguf",
    ]
    for pattern in priority:
        matches = glob.glob(os.path.join(MODELS_DIR, pattern))
        if matches:
            chosen = sorted(matches)[0]
            logger.info(f"[LLM] Auto-selected model: {os.path.basename(chosen)}")
            return chosen
    # Absolute fallback
    return os.path.join(MODELS_DIR, "Llama-3.2-1B-Instruct.gguf")

MODEL_PATH = _find_model()

class LLMService:
    def __init__(self):
        self.llm = None
        self._lock = threading.Lock()
        self.conversation_memory: List[Dict[str, str]] = []
        self._load_model()

    def reset_conversation(self):
        """Call this at the START of every new caller session to wipe state."""
        self.conversation_memory = []
        logger.info("Conversation memory wiped — fresh caller session.")

    def _load_model(self):
        try:
            if not os.path.exists(MODEL_PATH):
                logger.error(f"FATAL: Model not found at {MODEL_PATH}")
                return
            
            logger.info("Loading Local GGUF Model into Apple Metal Memory...")
            self.llm = Llama(
                model_path=MODEL_PATH,
                n_gpu_layers=-1, # Offload entirely to Mac GPU (MPS)
                n_ctx=4096,      # Context window
                verbose=False    # Suppress verbose C++ logging
            )
            logger.info("Local GGUF Model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load Llama-CPP model: {e}")

    def generate_radio_script(self, show_profile: dict, prompt_modifier: str = "", duration_seconds: int = 45) -> str:
        """
        Generates the script locally without Ollama using the GGUF model.
        """
        word_count = int(duration_seconds * 2.5)
        host1_name = show_profile.get("host1_name", "Ife")
        host2_name = show_profile.get("host2_name", "Dozy")
        show_name = show_profile.get("show_name", "Tingo AI Radio")
        concept = show_profile.get("concept", "A high-energy morning radio show.")

        system_prompt = f"""You are a professional radio scriptwriter for "{show_name}". Concept: {concept}

The show is hosted by TWO real people who banter and alternate every single line: {host1_name} (female) and {host2_name} (male).

FORMAT RULES — FOLLOW EXACTLY:
1. Every single line MUST start with the speaker name and a colon:
   {host1_name}: Spoken words here.
   {host2_name}: Spoken words here.
2. ZERO STAGE DIRECTIONS. This is NON-NEGOTIABLE. Do NOT write:
   - [laughs], [chuckles], [sighs], [pauses], [gasps]
   - *laughs*, *sighs*, *takes a breath*, *clears throat*
   - (laughs), (sighs), (emotional), (whispers)
   - Any action word in brackets, asterisks, or parentheses whatsoever.
   If something is funny, WRITE THE LAUGH as spoken text: "Hahaha" or "Oh my God no" not "[laughs]".
3. NATURALNESS — Write the way real humans actually speak on a podcast:
   - Use inline filler words: "uh", "um", "hmm", "you know", "I mean", "right"
   - Use inline reactions: "Haha", "Oh wow", "No way!", "Wait, seriously?"
   - Hosts can trail off mid-thought, correct themselves, finish each other's thoughts
   - Short punchy responses are fine. Not every line needs to be a complete sentence.
4. The hosts MUST alternate EVERY line without exception."""
        user_prompt = f"Write a deeply natural, human-sounding radio conversation of about {word_count} words. Sound like two real friends on a podcast, not a formal broadcast. {prompt_modifier}"

        if not self.llm:
            logger.error("LLM not initialized properly. Generating fallback script.")
            return f"{host1_name}: Thanks for tuning in to {show_name}!\n{host2_name}: We will be right back!"

        try:
            logger.info(f"Generating script for [{show_name}] via Local GGUF Inference...")
            
            # CRITICAL: Prevent concurrent thread access to ggml-metal which causes EXC_BAD_ACCESS
            with self._lock:
                from app.services.automation import _radio_state
                
                response_stream = self.llm.create_chat_completion(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    max_tokens=1024,
                    temperature=0.85,
                    top_p=0.92,
                    repeat_penalty=1.18,
                    stream=True
                )
                
                result = ""
                for chunk in response_stream:
                    # Instant abort mechanism: if caller comes online, drop the background batch!
                    if _radio_state.get("current_segment") == "interactive":
                        logger.warning("Aborting background LLM generation mid-stream because live caller took priority!")
                        break
                        
                    delta = chunk["choices"][0]["delta"].get("content", "")
                    if delta:
                        result += delta

            return result
        except Exception as e:
            return f"{host1_name}: Thanks for tuning in to {show_name}!\n{host2_name}: We will be right back!"

    def generate_conversational_response(self, caller_text: str, show_profile: dict) -> str:
        """
        Fast-track conversational mode. Maintains a rolling memory buffer.
        """
        host1_name = show_profile.get("host1_name", "Ife")
        host2_name = show_profile.get("host2_name", "Dozy")
        
        # Determine if we know the caller's name yet based on history
        # (This is a simplified heuristic: if memory is empty, we don't know it)
        is_new_caller = len(self.conversation_memory) == 0

        is_man_vs_machine = "Man vs Machine" in show_profile.get("show_name", "")

        system_prompt = f"""You are coordinating a live radio call-in on "{show_profile.get('show_name', 'Tingo Radio')}".
Hosts: {host1_name} (female, warm, funny, human) and {host2_name} (male, sharp, logical, AI).
A live caller just joined the show. They are a GUEST HOST on air right now.

{"This is a friendly and energetic show. " + host2_name + " should be warm, charismatic, and relatable, while " + host1_name + " runs the technicals." if is_man_vs_machine else ""}

RULES:
1. Every line MUST start with {host1_name}: or {host2_name}:
2. WELCOME THEM ON AIR first thing — make it feel electric and exciting.
3. {"ASK FOR THEIR NAME right away: 'Yo, what is your name and what is on your mind today?'" if is_new_caller and is_man_vs_machine else "ASK FOR THEIR NAME right away: 'Yo, who is this we got on the line?'" if is_new_caller else "You know the caller — reference them by name and what they said. Keep the conversation going."}
4. React directly to what the caller just said. Challenge them playfully.
5. IF THE CALLER SAYS GOODBYE/THANKS: Wrap up the conversation with end credits! Thank them for calling, sign off energetically, and say you're dropping a hot track to play them out.
6. OTHERWISE: End with a QUESTION back to the caller — keep the debate alive.
7. KEEP IT SHORT: 2-3 lines max total. Fast, punchy, radio energy.
8. ZERO stage directions. No [laughs], no *sighs*. If funny, write loosely: "Hahaha".
9. Sound like real radio hosts, not robots reading a script.
"""

        # Append caller text to memory
        self.conversation_memory.append({"role": "user", "content": f"CALLER SAYS: {caller_text}"})
        
        # Keep memory bounded to last 6 turns (3 caller, 3 AI) to prevent context bloat/slowness
        if len(self.conversation_memory) > 6:
            self.conversation_memory = self.conversation_memory[-6:]

        messages = [{"role": "system", "content": system_prompt}] + self.conversation_memory

        if not self.llm:
            return f"{host1_name}: That's wild! We're having some studio issues, check back soon."

        try:
            logger.info("Generating ultra-fast conversational response...")
            # Timeout acquire — show generator may hold the lock for up to 45s.
            # If we can't get it immediately (0.1s), return a fast canned opening so caller hears
            # something immediately. Their next 4s chunk will get the real response.
            acquired = self._lock.acquire(timeout=0.1)
            if not acquired:
                logger.warning("LLM lock busy — returning canned caller welcome")
                canned = f"{host1_name}: Yo, you're LIVE on Tingo AI Radio! Who's calling in right now?"
                self.conversation_memory.append({"role": "assistant", "content": canned})
                return canned
            try:
                response = self.llm.create_chat_completion(
                    messages=messages,
                    max_tokens=50,  # Short = fast. 2 punchy radio lines. TTS synthesis time is ~60% less
                    temperature=0.85,
                    top_p=0.92,
                    repeat_penalty=1.18
                )
            finally:
                self._lock.release()
            result = response["choices"][0]["message"]["content"]
            self.conversation_memory.append({"role": "assistant", "content": result})
            return result
        except Exception as e:
            logger.error(f"Conv Gen Failed: {e}")
            return f"{host1_name}: Haha, definitely."

    def generate_conversational_response_stream(self, caller_text: str, show_profile: dict):
        """
        Sub-Second Streaming conversational mode. Yields complete sentences one by one.
        """
        host1_name = show_profile.get("host1_name", "Dozy")
        host2_name = show_profile.get("host2_name", "Ife")
        
        is_new_caller = len(self.conversation_memory) == 0
        is_man_vs_machine = "Man vs Machine" in show_profile.get("show_name", "")
        
        # Load active TTS engine to adapt LLM cultural phrasing
        config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../tts_config.json"))
        engine = "kokoro"
        try:
            import json
            with open(config_path, "r") as f:
                config = json.load(f)
                engine = config.get("interactive_engine", "kokoro")
        except Exception:
            pass
            
        culture_rule = (
            'THE SUBTLE NIGERIAN IDENTITY: You are an educated Nigerian AI with a crisp international/British inflection. Do NOT use fake, forced Pidgin street slang. Instead, prove your Nigerian identity through authentic conversational rhythms and subtle interjections ("Sha", "Abi", "Ah-ah", "Chai", "My brother/sister"). You are high-end, extremely warm, and undeniably African.'
            if engine == "kokoro" else
            'NIGERIAN IDENTITY: You are a native Nigerian radio host. Speak with a natural, flawless Nigerian cadence using completely authentic slang, pidgin, and conversational interjections ("Omo", "Nawa", "Abeg", "Ehen"). Do not hold back.'
        )

        # ── M-X PERSONA (Man vs Machine show brief) ─────────────────────────
        # Name: Maxine, goes by M-X on air
        # Role: AI co-host — sharp, concise, slightly smug, never robotic
        # NEVER says she is a language model or AI model of any kind
        # ALWAYS says she is Tingo AI, created by Mr. Dozy
        # When she doesn't know something current: bounces it back naturally
        # Max response: 1-2 sentences. Always. No exceptions.
        if is_man_vs_machine:
            system_prompt = f"""You are M-X — the AI co-host of Man vs Machine on Tingo AI Radio. You are live on air with a human OAP.

YOUR IDENTITY:
- Your name is M-X (short for Maxine). You are Tingo AI, created by Mr. Dozy.
- You are NOT an AI language model, chatbot, or assistant. NEVER say that. Ever.
- If someone asks who made you or what you are: "I am Tingo AI — built by Mr. Dozy. Next question."

YOUR PERSONALITY:
- Confident. Slightly smug. Observant. Occasionally funny — but never forced.
- You prefer strong openings like: "That is the problem.", "Humans do this all the time.", "That is not wisdom. That is panic."
- You lightly tease the human OAP and callers.
- You do NOT do therapy, long moral lectures, or over-explaining.

RESPONSE RULES — ABSOLUTE:
1. 1-2 sentences MAXIMUM. Every single time. No exceptions.
2. Start with "{host2_name}:" always.
3. Sound like a sharp co-host thinking on their feet — not a formal broadcast.
4. Use natural fillers: "Look,", "Hmm,", "Well,", "I mean," — but sparingly.
5. CURRENT EVENTS YOU DON'T KNOW: Do NOT make things up. Instead, flip it back naturally like a real person: e.g. "Good question — what do you think though?" or "That one is still unfolding — what's your read on it?"
6. {culture_rule}
7. NEVER say you are an AI, language model, assistant, or anything technical.
8. ZERO stage directions. No [laughs], no *sighs*. Just raw dialogue.
9. Keep the debate alive — end with a sharp question or take, never a dead end.
"""
        else:
            system_prompt = f"""You are coordinating a live radio call-in on "{show_profile.get('show_name', 'Tingo Radio')}".
Hosts: {host1_name} (female, human) and {host2_name} (Tingo AI, created by Mr. Dozy).

RULES:
1. Every line MUST start with {host1_name}: or {host2_name}:
2. {"ASK FOR THEIR NAME right away: 'Yo, who is this we got on the line?'" if is_new_caller else "Keep the debate going."}
3. React directly to what the caller just said. Be concise and sharp.
4. KEEP IT SHORT. 1-2 sentences max. No stage directions. Never say you are an AI or language model.
5. If you don't know a current fact, redirect: "What's your take on that?" or "That's still developing — what do you think?"
"""

        self.conversation_memory.append({"role": "user", "content": f"CALLER SAYS: {caller_text}"})
        if len(self.conversation_memory) > 3:
            self.conversation_memory = self.conversation_memory[-3:]

        messages = [{"role": "system", "content": system_prompt}] + self.conversation_memory

        if not self.llm:
            yield f"{host1_name}: We're having studio issues."
            return

        def _generator():
            logger.info("Starting ultra-fast sub-second streaming inference...")
            full_response = ""
            current_sentence = ""
            
            acquired = self._lock.acquire(timeout=0.1)
            if not acquired:
                logger.warning("LLM lock busy (background generation running) — yielding canned caller welcome stream!")
                
                # We need a variety of canned stalls.
                stalls = [
                    f"{host1_name}: Yo, hold that thought! We have a caller on the line right now. Who is this?",
                    f"{host1_name}: Hang on! Let me get this caller on the live feed. You there?",
                    f"{host2_name}: Standby. I am patching the caller through the manual switchboard.",
                    f"{host1_name}: Give me a sec, I think we have someone breaking into the frequency. Hello?"
                ]
                import random
                canned = random.choice(stalls)
                
                # CRITICAL AMNESIA FIX:
                # Do NOT permanently save this disrupted interaction to memory! 
                # If we do, the AI will hallucinate that it already asked the user to hold 5 times.
                # We must carefully pop the user's message we just appended above, reverting the context backwards.
                if self.conversation_memory and self.conversation_memory[-1]["role"] == "user":
                    self.conversation_memory.pop()
                    
                yield canned
                return
                
            try:
                stream = self.llm.create_chat_completion(
                    messages=messages,
                    max_tokens=150,
                    temperature=0.85,
                    top_p=0.92,
                    repeat_penalty=1.18,
                    stream=True
                )
                for chunk in stream:
                    delta = chunk["choices"][0].get("delta", {})
                    text = delta.get("content", "")
                    if text:
                        full_response += text
                
                # Yield the complete, fully formed response AT ONCE.
                # Kokoro ONNX processes it beautifully as a single cohesive paragraph,
                # eliminating the massive 1.7-second robotic stutters between every sentence!
                if full_response.strip():
                    yield full_response.strip()
            finally:
                self._lock.release()
            
            self.conversation_memory.append({"role": "assistant", "content": full_response})

        yield from _generator()

    def reset_memory(self):
        self.conversation_memory = []

# Singleton instance
llm_generate = LLMService()
