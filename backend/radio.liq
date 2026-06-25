# --- Liquidsoap Script: Tingo AI Radio ---
# NOTE: Do NOT run this file directly. start_radio.sh generates /tmp/tingo_radio.liq
# with the correct absolute paths substituted in before launching Liquidsoap.
set("log.file.path", "/tmp/liquidsoap.log")
set("log.level", 3)

# Telnet server for FastAPI to push tracks via nc
set("server.telnet", true)
set("server.telnet.bind_addr", "127.0.0.1")
set("server.telnet.port", 1234)

# --- Source 1: AI-generated show queue (HIGH PRIORITY) ---
# Python automation pushes: song intros, songs, show segments here in sequence
show_api = request.queue(id="show_api")

# --- Source 1.5: Interactive Live Conversational Queue (ULTRA PRIORITY) ---
# Used exclusively for sentence-by-sentence streaming (zero crossfade)
interactive_api = request.queue(id="interactive_api")

# --- Source 2: Music fallback playlist ---
# Plays automatically from the music folder when nothing is in the AI queue
# MUSIC_DIR is set by start_radio.sh to be portable across machines
music_fallback = playlist(
  mode="random",
  reload_mode="watch",
  "MUSIC_DIR_PLACEHOLDER"
)

# --- Priority Mixing ---
# Layer 1: Regular radio — show_api queue + music fallback.
# track_sensitive=true means songs in music_fallback play to completion before
# show_api content kicks in. This ensures songs are never cut mid-play.
regular_radio = fallback(
  track_sensitive=true,
  [show_api, music_fallback]
)

# Apply crossfade AFTER the fallback so Liquidsoap can still detect track boundaries!
crossed_radio = crossfade(
  fade_in=1.,
  fade_out=2.,
  regular_radio
)

# Layer 2: Interactive caller override.
# track_sensitive=false means a live caller IMMEDIATELY interrupts anything playing.
# This is intentional — callers get instant air time.
radio_stream = fallback(
  track_sensitive=false,
  [interactive_api, crossed_radio, blank()]
)

# --- Webhook Sync ---
# Ensure the backend accurately tracks fallback events.
def on_track_change(m) =
  let title = url.encode(m["title"])
  let artist = url.encode(m["artist"])
  let filename = url.encode(m["filename"])
  ignore(system("curl -s -X POST http://127.0.0.1:8080/api/internal/metadata -d 'title=" ^ title ^ "&artist=" ^ artist ^ "&filename=" ^ filename ^ "' >/dev/null 2>&1 &"))
end

radio_stream_synced = radio_stream.on_metadata(on_track_change)

# --- Archiving ---
# Save the live stream directly to disk chunked by hour
output.file(
  %mp3(bitrate=192),
  "ARCHIVE_DIR_PLACEHOLDER/archive-%Y-%m-%d-%H.mp3",
  reopen_when={ 0m0s },
  radio_stream_synced
)

# --- Icecast Output ---
output.icecast(
  %mp3(bitrate=320),
  host="localhost", port=8000,
  password="hackme", mount="stream",
  name="Tingo AI Radio Live",
  description="24/7 Autonomous AI Broadcaster",
  radio_stream_synced
)

