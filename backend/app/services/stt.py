import logging
from faster_whisper import WhisperModel
import io

logger = logging.getLogger(__name__)

class STTService:
    def __init__(self, model_size="tiny.en", device="cpu", compute_type="int8"):
        """
        Initializes the Faster-Whisper model in memory.
        For Apple Silicon (M1/M2/M3), 'cpu' with 'int8' or 'float32' is highly optimized via Accelerate.
        We use 'tiny.en' or 'base.en' for sub-second latency ideal for live radio.
        """
        logger.info(f"Loading STT Model: {model_size} on {device}")
        try:
            self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
            logger.info("STT Model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load WhisperModel: {e}")
            self.model = None

    def transcribe_audio_chunk(self, audio_bytes: bytes) -> str:
        """
        Takes raw audio bytes (e.g. from Webm or WAV WebSocket stream)
        and attempts to transcribe them to text.
        """
        if not self.model:
            return ""
            
        try:
            # We wrap the bytes in a BytesIO object so faster-whisper can read it like a file
            audio_io = io.BytesIO(audio_bytes)
            
            # transcription returns a generator of segments
            segments, info = self.model.transcribe(audio_io, beam_size=1)
            
            transcript = ""
            for segment in segments:
                transcript += segment.text + " "
                
            clean_text = transcript.strip()
            
            # ABSOLUTE PREEMPTION: Faster-Whisper is notoriously hyper-sensitive. 
            # In complete silence, it physically hallucinates phrases like "Thank you." 
            # This causes the backend to infinitely stack AI replies to empty air, creating a 2-minute GPU backlog.
            # We surgically eliminate these known hallucinations natively.
            hallucinations = [
                "Thank you.", "Thank you", "one", "done", "Bye.", 
                "Thank you for watching.", "Thanks.", "You.", "Hey.", "Yeah.",
                "Thank you so much.", "Please subscribe.", "Please rate and review."
            ]
            if clean_text in hallucinations:
                logger.info(f"Filtered out STT hallucination: '{clean_text}'")
                return ""
                
            return clean_text
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return ""

# We create a singleton so the model stays loaded in RAM
stt_service = STTService()
