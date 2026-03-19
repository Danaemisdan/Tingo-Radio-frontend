# Customizing Tingo AI Radio: Adding New Voices & Human Emotion

If you want the AI hosts to cough, laugh natively, and sound completely indistinguishable from humans, `edge-tts` is not enough. You need **Coqui XTTS**, which uses zero-shot voice cloning.

Because XTTS requires specific older Python packages (like `numba`), it failed to install on your Mac's default Python 3.13 environments. Here is exactly how you can install it, add new voices, and achieve Hollywood-level naturalness.

## Step 1: Install Python 3.10 via Miniforge or Pyenv
You must use Python 3.10. The easiest way on a Mac is using Homebrew to install `pyenv`.

1. Open your terminal and run:
   ```bash
   brew install pyenv
   pyenv install 3.10.13
   ```

2. Create a specific virtual environment for your XTTS server:
   ```bash
   cd Tingo\ AI\ radio/backend/tts_server
   ~/.pyenv/versions/3.10.13/bin/python3 -m venv xtts_env
   source xtts_env/bin/activate
   ```

## Step 2: Install Coqui TTS 
Inside that activated `xtts_env`, install the library:

```bash
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install TTS
pip install fastapi uvicorn pydantic requests
```

## Step 3: Run the Local Server
While your `xtts_env` is activated, boot the microservice:
```bash
uvicorn main:app --host 0.0.0.0 --port 8001
```

## Step 4: Adding New Voices
It's incredibly simple to add new presenters!
1. Find a clear 5 to 10-second `.wav` audio clip of any voice you want. (No background noise).
2. Save it inside the `backend/media/voices/` folder (e.g., `new_host.wav`).
3. If using XTTS, just go to `app/services/tts.py` and modify your URL call to request `speaker_wav: "new_host.wav"`.

## Step 5: How To Force Laughs and Coughs
XTTS reads punctuation incredibly well. If using XTTS, you instruct the LLM to write:
`Ahem. [cough] Well... hahahaha! I completely agree with you.`
The engine will physically synthesize a throat clear and a laugh. The engine responds perfectly to "haha", "hmm", "uhhh", and "sigh".
