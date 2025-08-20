from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.environ.get('RDS_INSTANCE')
engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        print("Connected to Postgres successfully!")
except Exception as e:
    print("Error connecting:", e)

# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# Base = declarative_base()