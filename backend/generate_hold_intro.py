import os
import requests

SHOWS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "media/shows"))
os.makedirs(SHOWS_DIR, exist_ok=True)

final_path = os.path.join(SHOWS_DIR, "patching_caller.wav")

def generate():
    text = "Hold up Dozy, we've got a live caller coming through! Patching it in now..."
    payload = {
        "text": text,
        "speaker_wav": "ife_target.wav",
        "language": "en"
    }
    print("Synthesizing intro...")
    try:
        response = requests.post("http://localhost:8001/synthesize", json=payload, timeout=60)
        if response.status_code == 200:
            with open(final_path, 'wb') as f:
                f.write(response.content)
            print("Successfully saved to", final_path)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    generate()
