from datetime import datetime
import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=True)
    color = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Pin(Base):
    __tablename__ = "pins"
    id = Column(String, primary_key=True, default=gen_uuid)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    title = Column(String, nullable=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    color_snapshot = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="pins")
