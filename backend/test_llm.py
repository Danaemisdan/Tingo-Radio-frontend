import asyncio
from app.services.llm import LLMService

def run():
    llm = LLMService()
    print("Testing connection to Ollama...")
    res = llm.generate_radio_script("Dune Part 2 Review")
    print("\n[RESULT]\n", res)

run()
