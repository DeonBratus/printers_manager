from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy.exc import NoResultFound
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
from dotenv import load_dotenv
from typing import Optional
from database import get_db
from models import User, Session as DbSession
import uuid

# Load environment variables
load_dotenv()

# Configure environment variables with defaults
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-for-development")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_DAYS = int(os.getenv("ACCESS_TOKEN_EXPIRE_DAYS", "30"))

# Set up password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme for token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def verify_password(plain_password, hashed_password):
    """Verify that the password matches the hashed password"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Generate a hash from the password"""
    return pwd_context.hash(password)

def create_session_token(user_id: int, db: Session) -> str:
    """Create a new session token for a user"""
    expires_at = datetime.now() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    session = DbSession(
        user_id=user_id,
        token=str(uuid.uuid4()),
        expires_at=expires_at
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session.token

def create_access_token(data: dict):
    """Create a JWT access token containing user information"""
    to_encode = data.copy()
    expire = datetime.now() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt, expire

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Get the current user from the session token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Try to find a valid session with this token
        session = db.query(DbSession).filter(
            DbSession.token == token,
            DbSession.expires_at > datetime.now()
        ).first()
        
        if not session:
            raise credentials_exception
        
        # Get the user associated with this session
        user = db.query(User).filter(User.id == session.user_id).first()
        if not user or not user.is_active:
            raise credentials_exception
            
        return user
    except Exception:
        raise credentials_exception

def get_current_active_user(current_user: User = Depends(get_current_user)):
    """Get the current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def get_studio_id_from_user(current_user: User = Depends(get_current_user)):
    """Utility to extract the studio ID from the current user"""
    return current_user.studio_id 