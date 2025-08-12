# API (FastAPI + Socket.IO)

Run locally:

```bash
cd map-collab-mvp/api
python -m venv .venv
source .venv/bin/activate  # Windows PS: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Endpoints:

- Socket.IO: `ws://localhost:8000/socket.io/`
- Health: `http://localhost:8000/health`
