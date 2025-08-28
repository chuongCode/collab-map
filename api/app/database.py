from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

# Prefer explicit RDS instance var, fall back to common DATABASE_URL, then to a local sqlite file for dev.
DATABASE_URL = os.environ.get('RDS_INSTANCE') or os.environ.get('DATABASE_URL') or 'sqlite:///./dev.db'

if DATABASE_URL.startswith('sqlite'):
    # sqlite needs the check_same_thread argument for SQLAlchemy when used with a single-threaded dev server
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        print(f"Connected to database: {DATABASE_URL}")
except Exception as e:
    print("Error connecting:", e)

# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# Base = declarative_base()
from sqlalchemy.orm import sessionmaker, declarative_base


# Create SessionLocal and Base for ORM usage elsewhere in the app
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def create_tables():
    """Create database tables from models. Safe to call at app startup in development."""
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables ensured/created")
    except Exception as e:
        print("Error creating tables:", e)