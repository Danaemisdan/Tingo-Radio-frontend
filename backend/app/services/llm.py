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
        # Global instantiation of the Llama-CPP model to keep it in Unified Memory
        self.llm = None
        self._lock = threading.Lock()
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
        host2_name = show_profile.get("host2_name", "Tingo")
        show_name = show_profile.get("show_name", "Tingo AI Radio")
        concept = show_profile.get("concept", "A high-energy morning radio show.")

        system_prompt = f"""You are a professional radio scriptwriter for "{show_name}". Concept: {concept}

The show has exactly TWO hosts who alternate every line:
- {host1_name} is the human host: warm, grounded, and speaks exactly like a real person having a natural conversation. Uses authentic but subtle Naija phrasing.
- {host2_name} is the AI host: highly intelligent but perfectly conversational. Talks like a real Lagos guy — completely natural, never robotic.

CRITICAL RULES FOR ULTRA-REALISTIC DIALOGUE:
1. Write exactly the way real humans speak: use natural pauses (commas), trailing thoughts, and casual sentence structures.
2. DO NOT overact or force excitement. Avoid excessive exclamation marks or ALL CAPS. The energy should come from genuine interest in the topic, not shouting.
3. Every line MUST start with the host name followed by a colon. Example:
   {host1_name}: Your spoken words here.
   {host2_name}: My spoken words here.
4. NEVER use stage directions like *laughs*, [laughs], (laughing), or [sigh]. If a host laughs or reacts, write the actual spoken sound subtly: "Haha", "Wait", "Hmm", "Ah".
5. NEVER use quotation marks around the spoken words.
6. Hosts MUST alternate every single line — no host speaks twice in a row.
7. ONLY output lines of dialogue. No asterisks, no brackets, no narration.
8. Use real Naija patterns naturally, like you'd hear on a high-quality relatable podcast."""
        user_prompt = f"Write a highly realistic, authentic, and naturally flowing radio conversation of about {word_count} words. {prompt_modifier}"

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
                    max_tokens=800,
                    temperature=0.9,
                    top_p=0.92
                )
            result = response["choices"][0]["message"]["content"]
            return result
        except Exception as e:
            logger.error(f"Failed to generate script via local Llama-CPP: {e}", exc_info=True)
            return f"{host1_name}: Thanks for tuning in to {show_name}!\n{host2_name}: We will be right back!"

# Singleton instance
llm_generate = LLMService()
