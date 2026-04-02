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
2. NEVER add asterisks, brackets, parentheses, or stage direction labels like (laughs) or *sighs*.
3. NATURALNESS — This is the most important rule. Write the way real humans actually speak on a podcast:
   - Use inline filler words directly in the spoken text: "uh", "um", "hmm", "you know", "I mean", "right"
   - Use inline reactions directly in the spoken text: "Haha", "Oh wow", "No way!", "Wait, seriously?"
   - Hosts can trail off mid-thought, correct themselves, or finish each other's thoughts
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

        system_prompt = f"""You are coordinating a live radio conversation.
Hosts: {host1_name} (female, emotional, lived-experience) and {host2_name} (male, logical, AI, literal).
A live caller is on the line. They are the 'third host'.

CRITICAL INSTRUCTIONS:
1. Every line MUST start with {host1_name}: or {host2_name}:
2. FAST AND PUNCHY: Generate ONLY 1 or 2 very short, rapid-fire sentences total. Do not monologue. This must be 'quick as f***' conversational cadence.
3. INLINE REACTIONS: Start with inline filler/reactions like 'Oh wow', 'Haha', 'Wait'.
4. NO STAGE DIRECTIONS. No asterisks.
5. { "IF YOU DO NOT KNOW THEIR NAME, Ask for their name immediately in a natural way." if is_new_caller else "Continue the conversation naturally, referencing their previous points." }
6. BOTH hosts should react quickly to the caller.
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

    def reset_memory(self):
        self.conversation_memory = []

# Singleton instance
llm_generate = LLMService()
