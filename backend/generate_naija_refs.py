import asyncio
import edge_tts
import os
import subprocess

async def generate_reference():
    voices = {
        "ife_target": "en-NG-EzinneNeural",
        "tingo_target": "en-NG-AbeoNeural"
    }
    
    # A highly expressive, dynamic reference text to give Coqui good emotional data
    text = "Welcome to the show! We are incredibly thrilled to be broadcasting live from Lagos today. It is an absolutely beautiful morning, and the energy in the studio is electric. Let's get right into the vibe!"
    
    for name, voice in voices.items():
        mp3_path = f"/Users/sanjeevn/Downloads/Tingo AI radio/backend/media/voices/{name}.mp3"
        wav_path = f"/Users/sanjeevn/Downloads/Tingo AI radio/backend/media/voices/{name}.wav"
        
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(mp3_path)
        
        # Convert to WAV (Coqui prefers 22050Hz Mono)
        subprocess.run(["ffmpeg", "-y", "-i", mp3_path, "-ar", "22050", "-ac", "1", wav_path], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"Generated {wav_path} using {voice}")

asyncio.run(generate_reference())
