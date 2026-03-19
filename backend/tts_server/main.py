import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import torch

# Monkey patch torch.load to bypass PyTorch 2.6.0 weights_only=True breaking change for Coqui TTS
_original_load = torch.load
def _patched_load(*args, **kwargs):
    kwargs['weights_only'] = False
    return _original_load(*args, **kwargs)
torch.load = _patched_load

from TTS.api import TTS
import tempfile
import uuid

app = FastAPI(title="Local XTTS Server")

# Initialize Coqui XTTS model
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Loading XTTS model on {device}...")
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
print("Model loaded successfully.")

class SynthesizeRequest(BaseModel):
    text: str
    speaker_wav: str  # filename of the wav file in the voices directory
    language: str = "en"

if not os.path.exists("outputs"):
    os.makedirs("outputs")

VOICES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../media/voices"))
os.makedirs(VOICES_DIR, exist_ok=True)

@app.post("/synthesize")
async def synthesize(request: SynthesizeRequest):
    try:
        # Check if voice reference exists
        ref_path = os.path.join(VOICES_DIR, request.speaker_wav)
        if not os.path.exists(ref_path):
            raise HTTPException(status_code=404, detail=f"Voice reference {request.speaker_wav} not found in {VOICES_DIR}")

        output_filename = f"outputs/output_{uuid.uuid4().hex[:8]}.wav"

        # Generate audio using XTTS
        tts.tts_to_file(
            text=request.text,
            speaker_wav=ref_path,
            language=request.language,
            file_path=output_filename
        )

        return FileResponse(output_filename, media_type="audio/wav")

    except Exception as e:
        print(f"Synthesis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "ok"}
