import requests
import json
import logging
import threading
from typing import Optional, List, Dict

logger = logging.getLogger(__name__)

from llama_cpp import Llama
import os

# Define the absolute path to the local GGUF model
MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../models/Llama-3.2-1B-Instruct.gguf"))

class LLMService:
    def __init__(self):
        self.llm = None
        self._lock = threading.Lock()
        self.conversation_memory: List[Dict[str, str]] = []
        self._load_model()

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
                response = self.llm.create_chat_completion(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    max_tokens=1024,
                    temperature=0.85,
                    top_p=0.92,
                    repeat_penalty=1.18
                )
            result = response["choices"][0]["message"]["content"]
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

{"THIS IS 'MAN VS MACHINE'. The central theme is a debate between Human instinct/emotion (represented by the Caller and " + host1_name + ") vs Artificial Intelligence/Logic (represented by " + host2_name + "). " + host2_name + " should be slightly smug, highly intelligent, and literal, while " + host1_name + " should defend the human side." if is_man_vs_machine else ""}

RULES:
1. Every line MUST start with {host1_name}: or {host2_name}:
2. WELCOME THEM ON AIR first thing — make it feel electric and exciting.
3. {"ASK FOR THEIR NAME right away: \"Yo, what's your name and are you Team Human or Team Machine?\"" if is_new_caller and is_man_vs_machine else "ASK FOR THEIR NAME right away: \"Yo, who's this we got on the line?\"" if is_new_caller else "You know the caller — reference them by name and what they said. Keep the debate going."}
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
            with self._lock:
                response = self.llm.create_chat_completion(
                    messages=messages,
                    max_tokens=150,  # Extremely low tokens for ultra-fast generation
                    temperature=0.85,
                    top_p=0.92,
                    repeat_penalty=1.18
                )
            result = response["choices"][0]["message"]["content"]
            
            # Save our response to memory so we remember what we said
            self.conversation_memory.append({"role": "assistant", "content": result})
            
            return result
        except Exception as e:
            logger.error(f"Conv Gen Failed: {e}")
            return f"{host1_name}: Haha, definitely."

    def generate_conversational_response_stream(self, caller_text: str, show_profile: dict):
        """
        Sub-Second Streaming conversational mode. Yields complete sentences one by one.
        """
        host1_name = show_profile.get("host1_name", "Ife")
        host2_name = show_profile.get("host2_name", "Dozy")
        
        is_new_caller = len(self.conversation_memory) == 0
        is_man_vs_machine = "Man vs Machine" in show_profile.get("show_name", "")

        system_prompt = f"""You are coordinating a live radio call-in on "{show_profile.get('show_name', 'Tingo Radio')}".
Hosts: {host1_name} (female, human) and {host2_name} (male, AI).

{"THIS IS 'MAN VS MACHINE'. The central theme is a debate between Human instinct (Caller/" + host1_name + ") vs AI Logic (" + host2_name + "). " + host2_name + " is smug and literal." if is_man_vs_machine else ""}

RULES:
1. Every line MUST start with {host1_name}: or {host2_name}:
2. {"ASK FOR THEIR NAME: \"Yo, what's your name and are you Team Human or Team Machine?\"" if is_new_caller and is_man_vs_machine else "ASK FOR THEIR NAME right away: \"Yo, who's this we got on the line?\"" if is_new_caller else "Keep the debate going."}
3. React directly to what the caller just said.
4. KEEP IT SHORT. Maximum 2-3 short sentences.
5. NO stage directions.
"""

        self.conversation_memory.append({"role": "user", "content": f"CALLER SAYS: {caller_text}"})
        if len(self.conversation_memory) > 6:
            self.conversation_memory = self.conversation_memory[-6:]

        messages = [{"role": "system", "content": system_prompt}] + self.conversation_memory

        if not self.llm:
            yield f"{host1_name}: We're having studio issues."
            return

        def _generator():
            logger.info("Starting ultra-fast sub-second streaming inference...")
            full_response = ""
            current_sentence = ""
            
            with self._lock:
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
                        current_sentence += text
                        full_response += text
                        
                        # Yield on punctuation that denotes a clear sentence boundary
                        if any(c in text for c in [".", "!", "?", "\n"]):
                            # avoid triggering on names like "Mr." or short stubs
                            if len(current_sentence.strip()) > 8:
                                yield current_sentence.strip()
                                current_sentence = ""
                
                if current_sentence.strip():
                    yield current_sentence.strip()
            
            self.conversation_memory.append({"role": "assistant", "content": full_response})

        return _generator()

    def reset_memory(self):
        self.conversation_memory = []

# Singleton instance
llm_generate = LLMService()
