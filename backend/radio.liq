# --- Liquidsoap Script: Tingo AI Radio ---
set("log.file.path", "liquidsoap.log")
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
music_fallback = playlist(
  mode="random",
  reload_mode="watch",
  "/Users/sanjeevn/Downloads/Tingo AI radio/media/music"
)

# Apply 3-second crossfade to the AI queue transitions (smooth song-to-show fade)
crossed_show = crossfade(
  fade_in=2.,
  fade_out=3.,
  show_api
)

# Apply crossfade to fallback music too
crossed_music = crossfade(
  fade_in=2.,
  fade_out=2.,
  music_fallback
)

# --- Priority Mixing ---
# When interactive queue has content it plays instantly without crossfade
# If interactive queue is empty, crossed_show takes over
# If AI queue is empty, music_fallback takes over seamlessly.
radio_stream = fallback(
  track_sensitive=false,
  [interactive_api, crossed_show, crossed_music, blank()]
)

# --- Icecast Output ---
output.icecast(
  %mp3(bitrate=320),
  host="localhost", port=8000,
  password="hackme", mount="stream",
  name="Tingo AI Radio Live",
  description="24/7 Autonomous AI Broadcaster",
  radio_stream
)

