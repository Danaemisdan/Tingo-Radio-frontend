#!/bin/bash
echo "Starting Tingo AI Radio Ecosystem..."

# 1. Start Local XTTS Server
echo "Starting Coqui XTTS Server (Port 8001)..."
cd backend/tts_server
if [ -d "xtts_env" ]; then
    ./xtts_env/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8001 > tts_server.log 2>&1 &
else
    echo "Warning: xtts_env not found. Please review the XTTS installation guide."
fi
cd ../..

# 3. Start Icecast Stream Server
echo "Starting Icecast (Port 8000)..."
cd backend
icecast -c icecast.xml > /dev/null 2>&1 &
cd ..

# 4. Start Liquidsoap Mixer
echo "Starting Liquidsoap Master Mixer..."
cd backend
export PATH="$HOME/.opam/default/bin:$PATH"
liquidsoap radio.liq > liquidsoap.log 2>&1 &
cd ..

# Wait a moment for Liquidsoap and XTTS to bind
sleep 5

# 5. Start FastAPI Orchestrator
echo "Starting FastAPI Backend Orchestrator (Port 8080)..."
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8080 > fastapi.log 2>&1 &
cd ..

# 6. Start Next.js Frontend
echo "Starting Next.js Frontend (Port 3001)..."
cd frontend
npm run dev -- -p 3001 > frontend.log 2>&1 &
cd ..

echo "Everything is running!"
echo "- Frontend: http://localhost:3001"
echo "- Radio Stream: http://localhost:8000/stream"
echo "- Backend API: http://localhost:8080"
echo "To stop everything, run: pkill -f 'uvicorn|liquidsoap|icecast|ollama|next'"
