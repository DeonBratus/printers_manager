from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from typing import List

from database import get_db
import models
import schemas
from auth import (
    verify_password, 
    get_password_hash, 
    create_access_token, 
    create_session_token,
    get_current_active_user,
    get_user_studios
)

router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
    responses={404: {"description": "Not found"}},
)

@router.post("/register", response_model=schemas.User)
def register_user(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user with this username or email already exists
    existing_user = db.query(models.User).filter(
        (models.User.username == user_data.username) | 
        (models.User.email == user_data.email)
    ).first()
    
    if existing_user:
        if existing_user.username == user_data.username:
            raise HTTPException(status_code=400, detail="Username already registered")
        else:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create the new user (without studio_id since we're using many-to-many now)
    hashed_password = get_password_hash(user_data.password)
    db_user = models.User(
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
            default_studio = models.Studio(
                name=f"{user_data.username}'s Studio", 
                description="Personal studio"
            )
            db.add(default_studio)
            db.flush()
            
            # Add user to studio as owner
            db.execute(
                models.user_studio.insert().values(
                    user_id=db_user.id,
                    studio_id=default_studio.id,
                    role=models.UserRole.OWNER
                )
            )
            
            studio_id = default_studio.id
        else:
            # Verify that the studio exists
            studio = db.query(models.Studio).filter(models.Studio.id == user_data.initial_studio_id).first()
            if not studio:
                raise HTTPException(status_code=404, detail="Studio not found")
            
            # Add user to the specified studio with the specified role
            db.execute(
                models.user_studio.insert().values(
                    user_id=db_user.id,
                    studio_id=user_data.initial_studio_id,
                    role=user_data.initial_role
                )
            )
            
            studio_id = user_data.initial_studio_id
        
        db.commit()
        db.refresh(db_user)
        
        # Manually construct the user response with studios data
        studio_name = db.query(models.Studio.name).filter(models.Studio.id == studio_id).scalar()
        role = user_data.initial_role if user_data.initial_studio_id else models.UserRole.OWNER
        
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

@router.post("/login", response_model=schemas.Token)
def login(form_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    # Authenticate the user
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    # Create session token
    session_token = create_session_token(user.id, db)
    
    # Create access token
    access_token, expires_at = create_access_token(data={"sub": str(user.id)})
    
    # Get user studios info
    studios_info = get_user_studios(user, db)
    
    # Convert to the format expected by the schema
    studios_data = []
    for studio in studios_info:
        studios_data.append({
            "id": studio["id"],
            "name": studio["name"],
            "role": studio["role"]
        })
    
    # Create user data with studios
    user_data = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_active": user.is_active,
        "is_superuser": user.is_superuser,
        "created_at": user.created_at,
        "studios": studios_data
    }
    
    return {
        "access_token": session_token,
        "token_type": "bearer",
        "expires_at": expires_at,
        "user": user_data
    }

@router.post("/logout")
def logout(current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    # Invalidate all sessions for this user
    db.query(models.Session).filter(models.Session.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
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
        "studios": studios_data
    }
    
    return user_data 