from typing import Any, Dict, Optional

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.sockets.board import register_board_handlers

# ALLOWED_ORIGINS restricts which browser origins can call the HTTP routes and open Socket.IO connections.
ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173", "*"]


# Create a Socket.IO asyncserver instance, integrate with ASGI servers like uvicorn, and indicate which browser origins are allowed to perform the handshake.
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=ALLOWED_ORIGINS,
    logger=False,
    engineio_logger=False,
)


# FastAPI app (for health checks and future REST endpoints)
fastapi_app = FastAPI(title="Map Collab MVP API", version="0.1.0")

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Designating a quick way to verify if the app is up
# Curl http://localhost:8000/health or open in a browser.
@fastapi_app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


"""ASGI composition (one app that serves both)
    ASGIApp mounts Socket.IO at /socket.io and forwards all other paths (e.g., /health, /docs) to FastAPI.
    Uvicorn runs this single app object.
"""
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)

register_board_handlers(sio)