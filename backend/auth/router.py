from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session as SQLAlchemySession
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
import os
import shutil
from pathlib import Path
import uuid

from db.database import get_db
from models import User, Studio, user_studio, UserRole, Session as UserSession
from schemas.users_schemas import UserBase, UserCreate, UserSettings
from schemas.auth_schemas import Token, LoginRequest

from auth.auth import (
    verify_password, 
    get_password_hash, 
    create_access_token, 
    create_session_token,
    get_current_active_user,
    get_user_studios
)

# Создаем директорию для аватаров, если она не существует
AVATAR_DIR = Path("uploads/avatars")
AVATAR_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
    responses={404: {"description": "Not found"}},
)

@router.post("/register", response_model=UserBase)
def register_user(user_data: UserCreate, db: SQLAlchemySession = Depends(get_db)):
    # Check if user with this username or email already exists
    existing_user = db.query(User).filter(
        (User.username == user_data.username) | 
        (User.email == user_data.email)
    ).first()
    
    if existing_user:
        if existing_user.username == user_data.username:
            raise HTTPException(status_code=400, detail="Username already registered")
        else:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create the new user (without studio_id since we're using many-to-many now)
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        is_active=user_data.is_active,
        is_superuser=user_data.is_superuser
    )
    
    try:
        db.add(db_user)
        db.flush()  # Get user ID without committing
        
        studio_id = None
        
        # Create default studio if initial_studio_id is not provided
        if not user_data.initial_studio_id:
            # Create a personal studio for the user
            default_studio = Studio(
                name=f"{user_data.username}'s Studio", 
                description="Personal studio"
            )
            db.add(default_studio)
            db.flush()
            
            # Add user to studio as owner
            db.execute(
                user_studio.insert().values(
                    user_id=db_user.id,
                    studio_id=default_studio.id,
                    role=UserRole.OWNER
                )
            )
            
            studio_id = default_studio.id
        else:
            # Verify that the studio exists
            studio = db.query(Studio).filter(Studio.id == user_data.initial_studio_id).first()
            if not studio:
                raise HTTPException(status_code=404, detail="Studio not found")
            
            # Add user to the specified studio with the specified role
            db.execute(
                user_studio.insert().values(
                    user_id=db_user.id,
                    studio_id=user_data.initial_studio_id,
                    role=user_data.initial_role
                )
            )
            
            studio_id = user_data.initial_studio_id
        
        db.commit()
        db.refresh(db_user)
        
        # Manually construct the user response with studios data
        studio_name = db.query(Studio.name).filter(Studio.id == studio_id).scalar()
        role = user_data.initial_role if user_data.initial_studio_id else UserRole.OWNER
        
        return {
            "id": db_user.id,
            "username": db_user.username,
            "email": db_user.email,
            "is_active": db_user.is_active,
            "is_superuser": db_user.is_superuser,
            "created_at": db_user.created_at,
            "studios": [
                {
                    "id": studio_id,
                    "name": studio_name,
                    "role": role
                }
            ]
        }
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Registration failed")

@router.post("/login", response_model=Token)
def login(form_data: LoginRequest, db: SQLAlchemySession = Depends(get_db)):
    # Authenticate the user
    user = db.query(User).filter(User.username == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    # Create session token first
    session_token = create_session_token(user.id, db)
    
    # Then create access token 
    access_token, expires_at = create_access_token(data={"sub": str(user.id)})
    
    # Get user studios info
    studios_info = get_user_studios(user, db)
    
    # Convert to the format expected by the schema
    studios_data = [
        {"id": studio["id"], "name": studio["name"], "role": studio["role"]}
        for studio in studios_info
    ]
    
    # Create user data with all required fields
    user_data = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_active": user.is_active,
        "is_superuser": user.is_superuser,
        "created_at": user.created_at,
        "studios": studios_data,
        "language": getattr(user, "language", "russian"),
        "default_view": getattr(user, "default_view", "grid"),
        "avatar": getattr(user, "avatar", None)
    }
    
    # Return full response with all tokens
    return {
        "access_token": access_token,
        "session_token": session_token,
        "token_type": "bearer",
        "expires_at": expires_at,
        "user": user_data
    }

@router.post("/logout")
def logout(current_user: UserBase = Depends(get_current_active_user), db: SQLAlchemySession = Depends(get_db)):
    # Invalidate all sessions for this user
    db.query(UserSession).filter(UserSession.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserBase)
def read_users_me(current_user: User = Depends(get_current_active_user), db: SQLAlchemySession = Depends(get_db)):
    # Get user studios info
    studios_info = get_user_studios(current_user, db)
    
    # Convert to the format expected by the schema
    studios_data = []
    for studio in studios_info:
        studios_data.append({
            "id": studio["id"],
            "name": studio["name"],
            "role": studio["role"]
        })
    
    # Return user data with studios
    user_data = {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_active": current_user.is_active,
        "is_superuser": current_user.is_superuser,
        "created_at": current_user.created_at,
        "studios": studios_data,
        "language": getattr(current_user, "language", "russian"),
        "default_view": getattr(current_user, "default_view", "grid")
    }
    
    return user_data

@router.put("/me/settings", response_model=UserSettings)
def update_user_settings(
    settings: UserSettings,
    current_user: User = Depends(get_current_active_user),
    db: SQLAlchemySession = Depends(get_db)
):
    """Update the current user's settings"""
    
    # Only update the fields that are provided
    if settings.username is not None:
        # Check if username already exists for another user
        existing_user = db.query(User).filter(
            User.username == settings.username,
            User.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already in use")
        current_user.username = settings.username
    
    if settings.email is not None:
        # Check if email already exists for another user
        existing_user = db.query(User).filter(
            User.email == settings.email,
            User.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = settings.email
    
    # Add new settings fields to the user
    if settings.language is not None:
        current_user.language = settings.language
    
    if settings.default_view is not None:
        current_user.default_view = settings.default_view
    
    # Save changes
    db.commit()
    db.refresh(current_user)
    
    # Return updated settings
    return {
        "username": current_user.username,
        "email": current_user.email,
        "language": getattr(current_user, "language", "russian"),
        "default_view": getattr(current_user, "default_view", "grid"),
        "avatar": current_user.avatar
    }

@router.post("/me/avatar", response_model=UserSettings)
async def upload_avatar(
    avatar: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: SQLAlchemySession = Depends(get_db)
):
    """Upload user avatar"""
    
    # Проверяем формат файла
    if not avatar.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Создаем уникальное имя файла
    file_ext = avatar.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(AVATAR_DIR, unique_filename)
    
    # Сохраняем файл
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(avatar.file, buffer)
    
    # Обновляем путь к аватару пользователя в БД
    # Если у пользователя уже был аватар, удаляем старый файл
    if current_user.avatar:
        old_avatar_path = os.path.join(AVATAR_DIR, os.path.basename(current_user.avatar))
        if os.path.exists(old_avatar_path):
            os.remove(old_avatar_path)
    
    # Сохраняем только имя файла
    current_user.avatar = unique_filename
    db.commit()
    db.refresh(current_user)
    
    return {
        "username": current_user.username,
        "email": current_user.email,
        "language": getattr(current_user, "language", "russian"),
        "default_view": getattr(current_user, "default_view", "grid"),
        "avatar": current_user.avatar
    }

@router.get("/avatar/{user_id}")
async def get_avatar(
    user_id: int,
    db: SQLAlchemySession = Depends(get_db)
):
    """Get user avatar by user_id"""
    
    # Получаем данные пользователя
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Если у пользователя нет аватара, возвращаем стандартный
    if not user.avatar:
        raise HTTPException(status_code=404, detail="Avatar not found")
    
    # Формируем путь к файлу аватара
    avatar_path = os.path.join(AVATAR_DIR, user.avatar)
    
    # Проверяем существование файла
    if not os.path.exists(avatar_path):
        raise HTTPException(status_code=404, detail="Avatar file not found")
    
    # Возвращаем файл
    return FileResponse(avatar_path, media_type="image/*")