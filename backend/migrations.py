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

-- Remove unique constraint from printer name
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'td_printers_name_key'
    ) THEN
        ALTER TABLE td_printers DROP CONSTRAINT td_printers_name_key;
    END IF;
END $$;

-- Drop unique index on printer name
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'ix_td_printers_name'
    ) THEN
        DROP INDEX ix_td_printers_name;
        -- Recreate as non-unique index
        CREATE INDEX ix_td_printers_name ON td_printers(name);
    END IF;
END $$;

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

def create_studio_invitations_table():
    """Create the studio invitations table"""
    try:
        with engine.connect() as connection:
            connection.execute(text("""
            CREATE TABLE IF NOT EXISTS td_studio_invitations (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                studio_id INTEGER REFERENCES td_studios(id) ON DELETE CASCADE,
                created_by INTEGER REFERENCES td_users(id),
                role VARCHAR(50) DEFAULT 'member',
                token VARCHAR(255) UNIQUE,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT NOW(),
                expires_at TIMESTAMP NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_studio_invitations_email ON td_studio_invitations(email);
            CREATE INDEX IF NOT EXISTS idx_studio_invitations_token ON td_studio_invitations(token);
            CREATE INDEX IF NOT EXISTS idx_studio_invitations_status ON td_studio_invitations(status);
            """))
            print("Studio invitations table created or already exists")
    except Exception as e:
        print(f"Error creating studio invitations table: {e}")

# Run all migrations
def run_migrations():
    """Run all migrations"""
    Base.metadata.create_all(bind=engine)
    
    # Create specific tables with special constraints
    create_sessions_table()
    
    # Create junction tables
    create_user_studio_table()
    create_role_permission_table()
    
    # Create studio invitations table
    create_studio_invitations_table()
    
    print("Migrations completed")

if __name__ == "__main__":
    print(f"Running migrations on {SQLALCHEMY_DATABASE_URL}")
    success = run_migrations()
    sys.exit(0 if success else 1) 