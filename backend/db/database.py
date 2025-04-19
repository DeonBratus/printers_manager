from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv  # Для загрузки .env

# Загружаем переменные окружения из .env
load_dotenv()

db_user = os.getenv("POSTGRES_USER", "postgres")
db_pass = os.getenv("POSTGRES_PASSWORD", "postgres")
db_name = os.getenv("POSTGRES_DB", "3d_printer_db")
db_host = os.getenv("POSTGRES_HOST", "localhost")
db_port = os.getenv("POSTGRES_PORT", "5432")

# Формируем DSN с экранированием специальных символов
from urllib.parse import quote_plus
safe_pass = quote_plus(db_pass)


# Get database URL from environment variable or use default
SQLALCHEMY_DATABASE_URL = f"postgresql://{db_user}:{safe_pass}@{db_host}:{db_port}/{db_name}"
print(SQLALCHEMY_DATABASE_URL)  # Debug: print the database URL to check if it's correct
# Create engine with proper encoding
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"client_encoding": "utf8"}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()