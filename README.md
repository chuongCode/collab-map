## Live cursors: FastAPI + Socket.IO + Mapbox GL JS

This project includes a tiny FastAPI + Socket.IO server and a React client that renders other users' cursors on a Mapbox map.

### Prereqs

- Mapbox token (`VITE_MAPBOX_TOKEN`) and a map style URL (`VITE_MAP_STYLE`)
- Node 18+ and Python 3.10+

### Run the API (WSL/Linux recommended)

```bash
cd map-collab-mvp/api
python -m venv .venv
source .venv/bin/activate  # Windows PowerShell: .venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Health: `http://localhost:8000/health`

### Run the web client

```bash
cd map-collab-mvp/web
npm i
echo VITE_MAPBOX_TOKEN=your_token_here > .env
echo VITE_MAP_STYLE=mapbox://styles/mapbox/streets-v12 >> .env
npm run dev
```

Open `http://localhost:5173` in two browser windows; move the mouse in one and you should see a small initials marker in the other.
