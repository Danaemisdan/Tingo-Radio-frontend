import os
# Force PyTorch to use Apple Metal (MPS) fallback for unsupported ops, preventing silent CPU downgrades
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"
os.environ["OMP_NUM_THREADS"] = "8" # Optimize any graphs that still spill over to the CPU

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
import gc

app = FastAPI(title="Local XTTS Server")

# Initialize Coqui XTTS model
device = "cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu")
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

# ---------------------------------------------------------
# Sub-Second Optimization: Precompute Speaker Latents
# ---------------------------------------------------------
speaker_latents = {}
import torchaudio

print("Precomputing speaker latents for ZERO-LATENCY streaming inference...")
for vfile in os.listdir(VOICES_DIR):
    if vfile.endswith(".wav"):
        try:
            ref_path = os.path.join(VOICES_DIR, vfile)
            print(f"Caching latents for {vfile}...")
            gpt_cond_latent, speaker_embedding = tts.synthesizer.tts_model.get_conditioning_latents(audio_path=[ref_path])
            speaker_latents[vfile] = (gpt_cond_latent, speaker_embedding)
        except Exception as e:
            print(f"Failed to precompute latents for {vfile}: {e}")
print("Precomputation complete.")

@app.post("/synthesize")
async def synthesize(request: SynthesizeRequest):
    try:
        # Check if voice reference exists
        ref_path = os.path.join(VOICES_DIR, request.speaker_wav)
        if not os.path.exists(ref_path):
            raise HTTPException(status_code=404, detail=f"Voice reference {request.speaker_wav} not found in {VOICES_DIR}")

        output_filename = f"outputs/output_{uuid.uuid4().hex[:8]}.wav"

        # Ultra-Fast Latent Cached Inference
        if request.speaker_wav in speaker_latents:
            gpt_cond_latent, speaker_embedding = speaker_latents[request.speaker_wav]
            
            out = tts.synthesizer.tts_model.inference(
                request.text,
                request.language,
                gpt_cond_latent,
                speaker_embedding,
                temperature=0.75,
                speed=0.92,
                top_k=50,
                top_p=0.85,
                repetition_penalty=5.0
            )
            wav_tensor = torch.tensor(out["wav"]).unsqueeze(0)
            torchaudio.save(output_filename, wav_tensor, 24000)
        else:
            # Fallback to high-level API if cache missed
            tts.tts_to_file(
                text=request.text,
                speaker_wav=ref_path,
                language=request.language,
                file_path=output_filename,
                temperature=0.75,
                speed=0.92
            )

        # CRITICAL MEMORY LEAK FIX FOR MAC:
        # PyTorch MPS Unified Memory retains latent graphs permanently, swapping to SSD and violently crashing the OS.
        # We forcibly annihilate the local tensors and execute a global hardware teardown of the MPS cache.
        if 'out' in locals(): del out
        if 'wav_tensor' in locals(): del wav_tensor
        gc.collect()
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            torch.mps.empty_cache()
        elif torch.cuda.is_available():
            torch.cuda.empty_cache()

        return FileResponse(output_filename, media_type="audio/wav")

    except Exception as e:
        print(f"Synthesis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "ok"}
