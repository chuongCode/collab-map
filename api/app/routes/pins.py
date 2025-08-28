from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime
import logging
from app.database import SessionLocal
from app import main as app_main
from app.models import Pin, User

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/pins")


class PinCreate(BaseModel):
    lat: float
    lng: float
    title: str | None = None
    created_by: str = Field(..., description="User id of creator")
    color_snapshot: str | None = None


class PinOut(BaseModel):
    id: str
    lat: float
    lng: float
    title: str | None = None
    created_by: str
    color_snapshot: str | None = None
    created_at: datetime


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/", response_model=List[PinOut])
def list_pins(db: Session = Depends(get_db)):
    pins = db.query(Pin).order_by(Pin.created_at.asc()).all()
    return pins


@router.post("/", response_model=PinOut)
def create_pin(pin_in: PinCreate, db: Session = Depends(get_db)):
    # Ensure user exists (create if missing)
    user = db.query(User).filter(User.id == pin_in.created_by).first()
    if not user:
        user = User(id=pin_in.created_by, name=None, color=pin_in.color_snapshot)
        db.add(user)
        db.commit()

    pin = Pin(
        lat=pin_in.lat,
        lng=pin_in.lng,
        title=pin_in.title,
        created_by=pin_in.created_by,
        color_snapshot=pin_in.color_snapshot,
    )
    db.add(pin)
    db.commit()
    db.refresh(pin)

    # Log the canonical pin saved to DB
    try:
        logger.info("Pin persisted: %s", {
            "id": pin.id,
            "lat": pin.lat,
            "lng": pin.lng,
            "title": pin.title,
            "created_by": pin.created_by,
            "color_snapshot": pin.color_snapshot,
            "created_at": pin.created_at.isoformat(),
        })
    except Exception:
        pass

    # Broadcast via socket.io if available
    try:
        sio = app_main.sio
        payload = {"pin": {
            "id": pin.id,
            "lat": pin.lat,
            "lng": pin.lng,
            "title": pin.title,
            "created_by": pin.created_by,
            "color_snapshot": pin.color_snapshot,
            "created_at": pin.created_at.isoformat(),
        }}

        # Run emit in a dedicated background thread that creates its own asyncio loop.
        # This avoids "no current event loop" errors when called from FastAPI worker threads.
        def _thread_emit(p):
            try:
                import asyncio
                asyncio.run(sio.emit("pin_created", p))
            except Exception as ee:
                try:
                    logger.error("Background thread emit failed: %s", str(ee))
                except Exception:
                    pass

        try:
            import threading

            t = threading.Thread(target=_thread_emit, args=(payload,), daemon=True)
            t.start()
            try:
                logger.info("Started background thread to emit pin_created: %s", {"id": pin.id})
            except Exception:
                pass
        except Exception as tt:
            try:
                logger.error("Failed to start background emit thread: %s", str(tt))
            except Exception:
                pass
    except Exception as e:
        try:
            logger.error("Failed to emit pin_created: %s", str(e))
        except Exception:
            pass

    return pin


@router.delete("/", status_code=204)
def delete_all_pins(db: Session = Depends(get_db)):
    try:
        count = db.query(Pin).delete()
        db.commit()
        try:
            logger.info("Deleted all pins (%s)", count)
        except Exception:
            pass
        # Broadcast cleared event to clients
        try:
            sio = app_main.sio

            def _thread_emit_clear():
                try:
                    import asyncio
                    asyncio.run(sio.emit("pins_cleared", {"count": count}))
                except Exception as ee:
                    try:
                        logger.error("Background thread emit failed (pins_cleared): %s", str(ee))
                    except Exception:
                        pass

            import threading

            t = threading.Thread(target=_thread_emit_clear, daemon=True)
            t.start()
        except Exception:
            pass
    except Exception as e:
        try:
            logger.error("Failed to delete pins: %s", str(e))
        except Exception:
            pass
    return {}
