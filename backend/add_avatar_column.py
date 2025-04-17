import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database connection details
db_user = os.getenv("POSTGRES_USER", "postgres")
db_pass = os.getenv("POSTGRES_PASSWORD", "postgres")
db_name = os.getenv("POSTGRES_DB", "3d_printer_db")
db_host = os.getenv("POSTGRES_HOST", "localhost")
db_port = os.getenv("POSTGRES_PORT", "5432")

# Create database URL
from urllib.parse import quote_plus
safe_pass = quote_plus(db_pass)
SQLALCHEMY_DATABASE_URL = f"postgresql://{db_user}:{safe_pass}@{db_host}:{db_port}/{db_name}"

# Create engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

def add_avatar_column():
    """Add avatar column to the users table"""
    try:
        with engine.connect() as connection:
            connection.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='td_users' AND column_name='avatar'
                ) THEN
                    ALTER TABLE td_users ADD COLUMN avatar VARCHAR;
                END IF;
            END $$;
            """))
            print("Avatar column added successfully or already exists")
    except Exception as e:
        print(f"Error adding avatar column: {e}")

if __name__ == "__main__":
    print(f"Running avatar column migration on {SQLALCHEMY_DATABASE_URL}")
    add_avatar_column() 