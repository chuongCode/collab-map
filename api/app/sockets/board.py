from typing import Dict, Any, Optional
import random


# ---- In-memory board state ----
_boards: Dict[str, Dict[str, Any]] = {}
# Structure: { board_id: { 'users': { user_id: { 'sid': ..., 'user': ..., 'color': ... } }, 'colors': set() } }

# Color palette (should match frontend palette)
COLOR_PALETTE = [
    "#1570EF",
    "#039855",
    "#DC6803",
    "#DD2590",
    "#F7D158",
    "#6A7796",
    "#E22B2B",
    "#8A3FFC",
]

def register_board_handlers(sio):
    @sio.event
    async def connect(sid: str, environ: Dict[str, Any], auth: Optional[Dict[str, Any]]):
        # Client connects; no room yet until join_board
        pass


    @sio.event
    async def disconnect(sid: str):
        # Remove user from board and broadcast updated user list
        try:
            session = await sio.get_session(sid)
        except KeyError:
            session = {}
        board_id = session.get("board_id")
        user = session.get("user")
        user_id = (user or {}).get("id")
        if board_id and user_id:
            board = _boards.get(board_id)
            if board and user_id in board["users"]:
                color = board["users"][user_id]["color"]
                board["colors"].discard(color)
                del board["users"][user_id]
                # Clean up board if empty
                if not board["users"]:
                    del _boards[board_id]
            await sio.emit(
                "user_left",
                {"sid": sid, "user": user},
                room=board_id,
                skip_sid=sid,
            )
            await sio.leave_room(sid, board_id)
            await _broadcast_user_list(sio, board_id)


    @sio.event
    async def join_board(sid: str, data: Dict[str, Any]):
        """Join a collaborative board (room).

        Expected data: { boardId: str, user: { id: str, name?: str, initials?: str } }
        """
        board_id = (data or {}).get("boardId")
        user = (data or {}).get("user")
        user_id = (user or {}).get("id")
        if not board_id or not user_id:
            await sio.emit("error", {"message": "boardId and user.id required"}, to=sid)
            return

        # Assign color
        board = _boards.setdefault(board_id, {"users": {}, "colors": set()})
        if user_id in board["users"]:
            color = board["users"][user_id]["color"]
        else:
            # Pick first available color, or random if all used
            available = [c for c in COLOR_PALETTE if c not in board["colors"]]
            color = available[0] if available else random.choice(COLOR_PALETTE)
            board["colors"].add(color)
        board["users"][user_id] = {"sid": sid, "user": user, "color": color}

        await sio.save_session(sid, {"board_id": board_id, "user": user})
        await sio.enter_room(sid, board_id)

        # Inform others in the room that a new user joined
        await sio.emit(
            "user_joined",
            {"sid": sid, "user": {**user, "color": color}},
            room=board_id,
            skip_sid=sid,
        )
        await _broadcast_user_list(sio, board_id)


    @sio.event
    async def leave_board(sid: str, data: Optional[Dict[str, Any]] = None):
        """Leave the current board (room)."""
        try:
            session = await sio.get_session(sid)
        except KeyError:
            return

        board_id = session.get("board_id")
        user = session.get("user")
        user_id = (user or {}).get("id")
        if board_id and user_id:
            board = _boards.get(board_id)
            if board and user_id in board["users"]:
                color = board["users"][user_id]["color"]
                board["colors"].discard(color)
                del board["users"][user_id]
                if not board["users"]:
                    del _boards[board_id]
            await sio.emit(
                "user_left",
                {"sid": sid, "user": user},
                room=board_id,
                skip_sid=sid,
            )
            await sio.leave_room(sid, board_id)
            await _broadcast_user_list(sio, board_id)


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
        user = session.get("user")
        user_id = (user or {}).get("id")
        if not board_id or not user_id:
            return

        board = _boards.get(board_id)
        color = None
        if board and user_id in board["users"]:
            color = board["users"][user_id]["color"]

        payload = {
            "sid": sid,
            "lng": (data or {}).get("lng"),
            "lat": (data or {}).get("lat"),
            "user": user,
            "color": color,
        }

        # Broadcast to room, excluding sender
        await sio.emit("cursor", payload, room=board_id, skip_sid=sid)


# Helper to broadcast the full user list (with colors) to all clients in the board
async def _broadcast_user_list(sio, board_id: str):
    board = _boards.get(board_id)
    if not board:
        await sio.emit("user_list", {"users": []}, room=board_id)
        return
    users = []
    for user_id, entry in board["users"].items():
        user = dict(entry["user"])
        user["color"] = entry["color"]
        users.append(user)
    await sio.emit("user_list", {"users": users}, room=board_id)
