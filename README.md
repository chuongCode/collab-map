## Premise

This is supposed to be some sort of collaborative platform for you to plot on a map together with your friends. TBD.

### Running this on local Prereqs:

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

In memory of Matt Fortes 💔
