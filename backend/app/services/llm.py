import requests
import json
from typing import Optional, List, Dict
import logging

logger = logging.getLogger(__name__)

from llama_cpp import Llama
import os

# Define the absolute path to the local GGUF model
MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../models/Llama-3.2-1B-Instruct.gguf"))

class LLMService:
    def __init__(self):
        # Global instantiation of the Llama-CPP model to keep it in Unified Memory
        self.llm = None
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
- {host1_name} is the human host: warm, passionate, uses Naija street slang naturally — like she's talking to her best friend, not performing.
- {host2_name} is the AI host: sharp, analytical, but talks like a real Lagos guy — not robotic at all.

STRICT FORMAT RULES:
1. Every line MUST start with the host name followed by a colon. Example:
   {host1_name}: Your spoken words here.
   {host2_name}: My spoken words here.
2. NEVER use stage directions like *laughs*, [laughs], (laughing), or [sigh]. If a host laughs, write the actual sound: "Haaa!", "Oya wait", "Guy stoppp", "Lmaooo", "Ah ahn!". Sound it out.
3. NEVER use quotation marks around the spoken words.
4. Hosts MUST alternate every single line — no host speaks twice in a row.
5. ONLY output lines of dialogue. No asterisks, no brackets, no narration, no directions.
6. Talk like authentic Lagosians. Use real Naija patterns: half-sentences, exclamations, filler phrases like "I swear", "abeg joor", "omo!", "e dey pain me", "my guy", "ah ahn", "no be lie", "wetin", "sha", "walahi". Sound like a real pirate radio station in Lagos, not a BBC broadcast."""
        user_prompt = f"Write a natural radio conversation of about {word_count} words. {prompt_modifier}"

        if not self.llm:
            logger.error("LLM not initialized properly. Generating fallback script.")
            return f"{host1_name}: Thanks for tuning in to {show_name}!\n{host2_name}: We will be right back!"

        try:
            logger.info(f"Generating script for [{show_name}] via Local GGUF Inference...")
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
            logger.error(f"Failed to generate script via local Llama-CPP: {e}")
            return f"{host1_name}: Thanks for tuning in to {show_name}!\n{host2_name}: We will be right back!"

# Singleton instance
llm_generate = LLMService()
