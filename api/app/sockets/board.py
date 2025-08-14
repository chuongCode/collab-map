from typing import Dict, Any, Optional

# ---- Socket.IO event handlers ----

def register_board_handlers(sio):
    @sio.event
    async def connect(sid: str, environ: Dict[str, Any], auth: Optional[Dict[str, Any]]):
        # Client connects; no room yet until join_board
        # You can validate auth here if needed
        pass


    @sio.event
    async def disconnect(sid: str):
        # Attempt to notify the room that this user left
        try:
            session = await sio.get_session(sid)
        except KeyError:
            session = {}
        board_id = session.get("board_id")
        user = session.get("user")
        if board_id:
            await sio.emit(
                "user_left",
                {"sid": sid, "user": user},
                room=board_id,
                skip_sid=sid,
            )


    @sio.event
    async def join_board(sid: str, data: Dict[str, Any]):
        """Join a collaborative board (room).

        Expected data: { boardId: str, user: { id: str, name?: str, initials?: str } }
        """
        board_id = (data or {}).get("boardId")
        user = (data or {}).get("user")
        if not board_id:
            # silently ignore or emit error back
            await sio.emit("error", {"message": "boardId required"}, to=sid)
            return

        await sio.save_session(sid, {"board_id": board_id, "user": user})
        await sio.enter_room(sid, board_id)

        # Inform others in the room that a new user joined
        await sio.emit(
            "user_joined",
            {"sid": sid, "user": user},
            room=board_id,
            skip_sid=sid,
        )


    @sio.event
    async def leave_board(sid: str, data: Optional[Dict[str, Any]] = None):
        """Leave the current board (room)."""
        try:
            session = await sio.get_session(sid)
        except KeyError:
            return

        board_id = session.get("board_id")
        user = session.get("user")
        if board_id:
            await sio.leave_room(sid, board_id)
            await sio.emit(
                "user_left",
                {"sid": sid, "user": user},
                room=board_id,
                skip_sid=sid,
            )


    @sio.event
    async def cursor(sid: str, data: Dict[str, Any]):
        """Relay a cursor update to everyone else in the same board.

        Expected data: { lng: number, lat: number }
        """
        try:
            session = await sio.get_session(sid)
        except KeyError:
            return

        board_id = session.get("board_id")
        if not board_id:
            return

        payload = {
            "sid": sid,
            "lng": (data or {}).get("lng"),
            "lat": (data or {}).get("lat"),
            "user": session.get("user"),
        }

        # Broadcast to room, excluding sender
        await sio.emit("cursor", payload, room=board_id, skip_sid=sid)
