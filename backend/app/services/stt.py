import logging
import io
import os
import tempfile
import subprocess

logger = logging.getLogger(__name__)

class STTService:
    def __init__(self, model_size="tiny.en", device="cpu", compute_type="float32"):
        """
        tiny.en for maximum speed to guarantee sub-second latency.
        """
        from faster_whisper import WhisperModel
        logger.info(f"Loading STT Model: {model_size} on {device} ({compute_type})")
        try:
            self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
            logger.info("STT Model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load WhisperModel: {e}")
            self.model = None
        self._model_size = model_size

    def transcribe_audio_chunk(self, audio_bytes: bytes) -> str:
        """
        Converts raw WebM browser audio to a proper 16kHz WAV via ffmpeg FIRST,
        then feeds the WAV file to Whisper. Raw WebM chunks via BytesIO lack proper
        container headers, causing Whisper to hallucinate or fail silently.
        """
        if not self.model:
            return ""
        if not audio_bytes or len(audio_bytes) < 100:
            return ""
            
        tmp_webm = None
        tmp_wav = None
        try:
            # Write raw WebM to disk
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
                f.write(audio_bytes)
                tmp_webm = f.name
            
            # Convert to 16kHz mono WAV — the format Whisper is trained on
            tmp_wav = tmp_webm.replace(".webm", "_stt.wav")
            result = subprocess.run([
                "ffmpeg", "-y", "-i", tmp_webm,
                "-ar", "16000", "-ac", "1", "-f", "wav", tmp_wav
            ], capture_output=True, timeout=3)
            
            if result.returncode != 0 or not os.path.exists(tmp_wav):
                logger.warning("STT ffmpeg conversion failed — skipping chunk")
                return ""
            
            # Feed clean WAV directly to Whisper
            # CRITICAL: vad_threshold=0.3 — the default 0.5 was stripping 100% of browser
            # mic audio as "silence". Browser WebM/Opus compression at low bitrates makes
            # speech look quieter than it is to the VAD model.
            segments, info = self.model.transcribe(
                tmp_wav,
                beam_size=3,
                language="en",
                vad_filter=True,
                vad_parameters=dict(
                    threshold=0.3,              # Default 0.5 strips ALL browser mic audio
                    min_speech_duration_ms=100, # Accept short utterances
                    min_silence_duration_ms=400,
                )
            )
            
            transcript = "".join(s.text for s in segments).strip()
            
            # Filter known faster-whisper hallucinations on dead air
            hallucinations = {
                "Thank you.", "Thank you", "one", "done", "Bye.",
                "Thank you for watching.", "Thanks.", "You.", "Hey.",
                "Thank you so much.", "Please subscribe.", "Please rate and review.",
                ".", ",", "!", "?"
            }
            if transcript in hallucinations:
                logger.info(f"Filtered hallucination: '{transcript}'")
                return ""
                
            # Heuristic filter for repetitive hallucinations produced by faster-whisper on static noise
            if "I'm going to try and get a new video." in transcript or "I don't know. Yeah. All right." in transcript:
                logger.info("Filtered heuristic hallucination phrase.")
                return ""
            if transcript.count("Thank you") > 2 or transcript.count("All right") > 2:
                logger.info("Filtered repetitive hallucination loops.")
                return ""
                
            if transcript:
                logger.info(f"STT [{self._model_size}]: '{transcript}'")
            return transcript
            
        except Exception as e:
            logger.error(f"STT transcription error: {e}")
            return ""
        finally:
            for f in [tmp_webm, tmp_wav]:
                if f and os.path.exists(f):
                    try: os.remove(f)
                    except: pass

    def transcribe_pcm(self, pcm_bytes: bytes) -> str:
        """Transcribe raw 16kHz mono PCM bytes directly using numpy, avoiding WebM concatenation bugs"""
        if not self.model or not pcm_bytes or len(pcm_bytes) < 16000:  # less than 0.5s
            return ""
        try:
            import numpy as np
            # Convert raw 16-bit PCM (s16le) to float32 numpy array
            audio_array = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0
            
            segments, info = self.model.transcribe(
                audio_array,
                beam_size=3,
                language="en",
                vad_filter=True,
                vad_parameters=dict(
                    threshold=0.3,
                    min_speech_duration_ms=100,
                    min_silence_duration_ms=400,
                )
            )
            
            transcript = "".join(s.text for s in segments).strip()
            
            hallucinations = {
                "Thank you.", "Thank you", "one", "done", "Bye.", "Thank you for watching.", 
                "Thanks.", "You.", "Hey.", "Thank you so much.", "Please subscribe.", 
                "Please rate and review.", ".", ",", "!", "?"
            }
            
            if transcript in hallucinations:
                return ""
                
            if "I'm going to try and get a new video." in transcript or "I don't know. Yeah. All right." in transcript:
                return ""
                
            if transcript.count("Thank you") > 2 or transcript.count("All right") > 2:
                return ""
                
            return transcript
            
        except Exception as e:
            logger.error(f"PCM STT error: {e}")
            return ""

# We create a singleton so the model stays loaded in RAM
stt_service = STTService()
