import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import sys

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

# Migration SQL for authentication setup
migration_sql = """
-- Create Studios table if it doesn't exist
CREATE TABLE IF NOT EXISTS td_studios (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    description VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Users table if it doesn't exist
CREATE TABLE IF NOT EXISTS td_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR NOT NULL UNIQUE,
    email VARCHAR NOT NULL UNIQUE,
    hashed_password VARCHAR NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    studio_id INTEGER REFERENCES td_studios(id)
);

-- Create Sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS td_sessions (
    id SERIAL PRIMARY KEY,
    token VARCHAR UNIQUE,
    user_id INTEGER REFERENCES td_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Check if studio_id column exists in td_printers, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='td_printers' AND column_name='studio_id'
    ) THEN
        ALTER TABLE td_printers 
        ADD COLUMN studio_id INTEGER,
        ADD CONSTRAINT fk_printer_studio FOREIGN KEY (studio_id) REFERENCES td_studios(id);
    END IF;
END $$;

-- Check if studio_id column exists in td_models, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='td_models' AND column_name='studio_id'
    ) THEN
        ALTER TABLE td_models 
        ADD COLUMN studio_id INTEGER,
        ADD CONSTRAINT fk_model_studio FOREIGN KEY (studio_id) REFERENCES td_studios(id);
    END IF;
END $$;

-- Check if studio_id column exists in td_printings, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='td_printings' AND column_name='studio_id'
    ) THEN
        ALTER TABLE td_printings 
        ADD COLUMN studio_id INTEGER,
        ADD CONSTRAINT fk_printing_studio FOREIGN KEY (studio_id) REFERENCES td_studios(id);
    END IF;
END $$;

-- Check if studio_id column exists in print_queue, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='print_queue' AND column_name='studio_id'
    ) THEN
        ALTER TABLE print_queue 
        ADD COLUMN studio_id INTEGER,
        ADD CONSTRAINT fk_queue_studio FOREIGN KEY (studio_id) REFERENCES td_studios(id);
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON td_users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON td_users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON td_sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON td_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_printers_studio_id ON td_printers(studio_id);
CREATE INDEX IF NOT EXISTS idx_models_studio_id ON td_models(studio_id);
CREATE INDEX IF NOT EXISTS idx_printings_studio_id ON td_printings(studio_id);
CREATE INDEX IF NOT EXISTS idx_queue_studio_id ON print_queue(studio_id);

-- Insert default studio if it doesn't exist
INSERT INTO td_studios (name, description)
SELECT 'default', 'Default studio'
WHERE NOT EXISTS (SELECT 1 FROM td_studios WHERE name = 'default');

-- Insert admin user if it doesn't exist (password: admin)
INSERT INTO td_users (username, email, hashed_password, is_active, is_superuser, studio_id)
SELECT 'admin', 'admin@example.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', TRUE, TRUE, 
       (SELECT id FROM td_studios WHERE name = 'default')
WHERE NOT EXISTS (SELECT 1 FROM td_users WHERE username = 'admin');
"""

def run_migrations():
    """Run database migrations"""
    try:
        print("Connecting to database...")
        conn = engine.connect()
        print("Running migrations...")
        
        # Execute the migration SQL
        conn.execute(text(migration_sql))
        conn.commit()
        
        print("Migrations completed successfully!")
        return True
    except Exception as e:
        print(f"Migration error: {str(e)}")
        return False
    finally:
        conn.close()
        engine.dispose()

if __name__ == "__main__":
    print(f"Running migrations on {SQLALCHEMY_DATABASE_URL}")
    success = run_migrations()
    sys.exit(0 if success else 1) 