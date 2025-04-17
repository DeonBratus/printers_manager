from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
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
    get_studio_id_from_user
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
    
    # Create default studio if studio_id is not provided
    if not user_data.studio_id:
        default_studio = models.Studio(name="default", description="Default studio")
        db.add(default_studio)
        db.flush()  # Get the studio ID without committing
        studio_id = default_studio.id
    else:
        # Verify that the studio exists
        studio = db.query(models.Studio).filter(models.Studio.id == user_data.studio_id).first()
        if not studio:
            raise HTTPException(status_code=404, detail="Studio not found")
        studio_id = user_data.studio_id
    
    # Create the new user
    hashed_password = get_password_hash(user_data.password)
    db_user = models.User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        is_active=user_data.is_active,
        is_superuser=user_data.is_superuser,
        studio_id=studio_id
    )
    
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
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
    
    return {
        "access_token": session_token,
        "token_type": "bearer",
        "expires_at": expires_at,
        "user": user
    }

@router.post("/logout")
def logout(current_user: models.User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    # Invalidate all sessions for this user
    db.query(models.Session).filter(models.Session.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_active_user)):
    return current_user

@router.get("/studios", response_model=List[schemas.Studio])
def get_studios(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Superusers can see all studios
    if current_user.is_superuser:
        return db.query(models.Studio).all()
    # Regular users can only see their own studio
    return [db.query(models.Studio).filter(models.Studio.id == current_user.studio_id).first()]

@router.post("/studios", response_model=schemas.Studio)
def create_studio(
    studio_data: schemas.StudioCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Only superusers can create new studios
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized to create studios")
    
    # Create new studio
    db_studio = models.Studio(**studio_data.dict())
    db.add(db_studio)
    db.commit()
    db.refresh(db_studio)
    return db_studio 