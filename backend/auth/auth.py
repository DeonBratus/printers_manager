from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session as SQLAlchemySession
from sqlalchemy.exc import NoResultFound
from sqlalchemy import text
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
from dotenv import load_dotenv
from typing import Optional, List
from db.database import get_db
from models import User, Session as UserSession, UserRole, StudioPermission
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

# Default role permissions mapping
DEFAULT_PERMISSIONS = {
    UserRole.OWNER: [
        StudioPermission.MANAGE_USERS,
        StudioPermission.MANAGE_PRINTERS,
        StudioPermission.MANAGE_MODELS,
        StudioPermission.MANAGE_PRINTINGS,
        StudioPermission.VIEW_REPORTS,
        StudioPermission.EDIT_STUDIO_SETTINGS
    ],
    UserRole.ADMIN: [
        StudioPermission.MANAGE_USERS,
        StudioPermission.MANAGE_PRINTERS,
        StudioPermission.MANAGE_MODELS,
        StudioPermission.MANAGE_PRINTINGS,
        StudioPermission.VIEW_REPORTS,
        StudioPermission.EDIT_STUDIO_SETTINGS
    ],
    UserRole.MANAGER: [
        StudioPermission.MANAGE_PRINTERS,
        StudioPermission.MANAGE_MODELS,
        StudioPermission.MANAGE_PRINTINGS,
        StudioPermission.VIEW_REPORTS
    ],
    UserRole.MEMBER: [
        StudioPermission.MANAGE_PRINTINGS,
        StudioPermission.VIEW_REPORTS
    ],
    UserRole.VIEWER: [
        StudioPermission.VIEW_REPORTS
    ]
}

def verify_password(plain_password, hashed_password):
    """Verify that the password matches the hashed password"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Generate a hash from the password"""
    return pwd_context.hash(password)

def create_session_token(user_id: int, db: SQLAlchemySession) -> str:
    """Create a new session token for a user"""
    expires_at = datetime.now() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    session = UserSession(
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

def get_current_user(token: str = Depends(oauth2_scheme), db: SQLAlchemySession = Depends(get_db)):
    """Get the current user from the session token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Try to find a valid session with this token
        session = db.query(UserSession).filter(
            UserSession.token == token,
            UserSession.expires_at > datetime.now()
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

def get_user_studio_role(user: User, studio_id: int, db: SQLAlchemySession = Depends(get_db)):
    """Get user's role in a specific studio"""
    # Query the user_studio table to get the user's role in this studio
    result = db.execute(
        text("""
        SELECT role FROM td_user_studio 
        WHERE user_id = :user_id AND studio_id = :studio_id
        """),
        {"user_id": user.id, "studio_id": studio_id}
    ).fetchone()
    
    if not result:
        return None
    
    return result[0]  # Return the role

def check_user_permission(
    user: User, 
    studio_id: int, 
    required_permission: StudioPermission,
    db: SQLAlchemySession = Depends(get_db)
):
    """Check if a user has a specific permission in a studio"""
    # Superusers have all permissions
    if user.is_superuser:
        return True
    
    # Get the user's role in this studio
    role = get_user_studio_role(user, studio_id, db)
    if not role:
        return False
    
    # Check if this role has the required permission in this studio
    # First check for custom role permissions
    custom_permission = db.execute(
        text("""
        SELECT 1 FROM td_role_permission 
        WHERE role = :role AND permission = :permission AND studio_id = :studio_id
        """),
        {"role": role, "permission": required_permission, "studio_id": studio_id}
    ).fetchone()
    
    if custom_permission:
        return True
    
    # If no custom permission is set, use the default permission mapping
    if role in DEFAULT_PERMISSIONS and required_permission in DEFAULT_PERMISSIONS[role]:
        return True
    
    return False

def get_user_studios(user: User, db: SQLAlchemySession = Depends(get_db)):
    """Get all studios a user is a member of"""
    # For superusers, we could return all studios if needed
    if user.is_superuser:
        # This could be customized based on your requirements
        pass
    
    # Query to get all studios the user is associated with
    results = db.execute(
        text("""
        SELECT s.id, s.name, us.role 
        FROM td_studios s
        JOIN td_user_studio us ON s.id = us.studio_id
        WHERE us.user_id = :user_id
        """),
        {"user_id": user.id}
    ).fetchall()
    
    studios = []
    for result in results:
        studios.append({
            "id": result[0],
            "name": result[1],
            "role": result[2]
        })
    
    return studios

def get_studio_id_from_user(current_user: User = Depends(get_current_user), db: SQLAlchemySession = Depends(get_db), selected_studio_id: Optional[int] = None):
    """Get the studio ID from the user
    
    If selected_studio_id is provided and the user has access to that studio, return it.
    Otherwise, return the first studio ID the user is a member of or None if user isn't in any studio
    """
    user_studios = get_user_studios(current_user, db)
    
    # If we have a selected studio ID and user has access to it, use that
    if selected_studio_id is not None:
        # Check if user has access to this studio
        for studio in user_studios:
            if studio["id"] == selected_studio_id:
                return selected_studio_id
    
    # Otherwise return the first studio or None
    if user_studios and len(user_studios) > 0:
        return user_studios[0]["id"]
    
    return None